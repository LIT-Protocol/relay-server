import {
	generateRegistrationOptions,
	GenerateRegistrationOptionsOpts,
} from "@simplewebauthn/server";
import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	AuthMethodVerifyRegistrationResponse,
	WebAuthnVerifyRegistrationRequest,
} from "../../models";

import type {
	VerifiedRegistrationResponse,
	VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { ethers, utils } from "ethers";
import { hexlify, toUtf8Bytes } from "ethers/lib/utils";
import config from "../../config";
import { getPubkeyForAuthMethod, mintPKP } from "../../lit";
import { getDomainFromUrl } from "../../utils/string";

function generateUserIDFromUserName(username: string): string {
	// TODO: use hash to avoid leaking username
	return username;
}

/**
 * Generates WebAuthn registration options for a given username.
 */
export function webAuthnGenerateRegistrationOptionsHandler(
	req: Request<{}, {}, {}, ParsedQs, Record<string, any>>,
	res: Response<{}, Record<string, any>, number>,
) {
	// Get username from query string
	const username = req.query.username as string;

	// Get RP_ID from request Origin.
	const rpID = getDomainFromUrl(req.get("Origin") || "localhost");

	const opts: GenerateRegistrationOptionsOpts = {
		rpName: "Lit Protocol",
		rpID,
		userID: generateUserIDFromUserName(username),
		userName: username,
		timeout: 60000,
		attestationType: "direct", // TODO: change to none
		authenticatorSelection: {
			userVerification: "required",
			residentKey: "required",
		},
		supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
	};

	const options = generateRegistrationOptions(opts);

	return res.json(options);
}

function generateAuthMethodId(username: string): string {
	return utils.keccak256(toUtf8Bytes(`${username}:lit`));
}

export async function webAuthnVerifyRegistrationHandler(
	req: Request<
		{},
		AuthMethodVerifyRegistrationResponse,
		WebAuthnVerifyRegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<
		AuthMethodVerifyRegistrationResponse,
		Record<string, any>,
		number
	>,
) {
	// Get username from request body.
	const username = req.body.username;

	// Get RP_ID from request Origin.
	const rpID = getDomainFromUrl(req.get("Origin") || "localhost");

	// Check if PKP already exists for this username.
	const authMethodId = generateAuthMethodId(username);
	try {
		const pubKey = await getPubkeyForAuthMethod({
			authMethodType: AuthMethodType.WebAuthn,
			authMethodId,
		});

		if (pubKey !== "0x" && !ethers.BigNumber.from(pubKey).isZero()) {
			console.info("PKP already exists for this username");
			return res.status(400).send({
				error: "Invalid username, please try another one",
			});
		}
	} catch (error) {
		const _error = error as Error;
		console.error(_error);
		return res.status(500).send({
			error: "Unable to verify if PKP already exists",
		});
	}

	// WebAuthn verification.
	let verification: VerifiedRegistrationResponse;
	try {
		const opts: VerifyRegistrationResponseOpts = {
			credential: req.body.credential,
			expectedChallenge: () => true, // we don't work with challenges in registration
			expectedOrigin: config.expectedOrigins,
			expectedRPID: rpID,
			requireUserVerification: true,
		};
		verification = await verifyRegistrationResponse(opts);
	} catch (error) {
		const _error = error as Error;
		console.error(_error);
		return res.status(400).send({ error: _error.message });
	}

	const { verified, registrationInfo } = verification;

	// Mint PKP for user.
	if (!verified || !registrationInfo) {
		console.error("Unable to verify registration", { verification });
		return res.status(400).json({
			error: "Unable to verify registration",
		});
	}

	const { credentialPublicKey } = registrationInfo;
	console.log("registrationInfo", { registrationInfo });

	try {
		const cborEncodedCredentialPublicKey = hexlify(
			utils.arrayify(credentialPublicKey),
		);
		console.log("cborEncodedCredentialPublicKey", {
			cborEncodedCredentialPublicKey,
		});

		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.WebAuthn,
			authMethodId,
			// We want to use the CBOR encoding here to retain as much information as possible
			// about the COSE (public) key.
			authMethodPubkey: cborEncodedCredentialPublicKey,
		});

		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (error) {
		const _error = error as Error;
		console.error("Unable to mint PKP for user", { _error });
		return res.status(500).json({
			error: "Unable to mint PKP for user",
		});
	}
}
