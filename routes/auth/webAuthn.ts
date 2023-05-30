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
	AuthMethodVerifyToFetchResponse,
	RegistrationRequest,
	WebAuthnVerifyRegistrationRequest,
} from "../../models";

import type {
	VerifiedRegistrationResponse,
	VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { ethers, utils } from "ethers";
import { hexlify, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import config from "../../config";
import {
	getPKPsForAuthMethod,
	getPubkeyForAuthMethod,
	mintPKP,
} from "../../lit";
import { getDomainFromUrl } from "../../utils/string";

/**
 * Generates WebAuthn registration options for a given username.
 */
export function webAuthnGenerateRegistrationOptionsHandler(
	req: Request<{}, {}, {}, ParsedQs, Record<string, any>>,
	res: Response<{}, Record<string, any>, number>,
) {
	// Get username from query string
	const username = req.query.username as string | undefined;

	// Get RP_ID from request Origin.
	const rpID = getDomainFromUrl(req.get("Origin") || "localhost");

	const authenticatorUsername = generateUsernameForOptions(username);
	const opts: GenerateRegistrationOptionsOpts = {
		rpName: "Lit Protocol",
		rpID,
		userID: keccak256(toUtf8Bytes(authenticatorUsername)).slice(2),
		userName: authenticatorUsername,
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

export async function webAuthnVerifyRegistrationHandler(
	req: Request<
		{},
		AuthMethodVerifyRegistrationResponse,
		RegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<
		AuthMethodVerifyRegistrationResponse,
		Record<string, any>,
		number
	>,
) {
	let { authMethodId, authMethodPubkey } = req.body;
	try {
		if (!authMethodPubkey) {
			return res.status(404).json({
				error: "Auth method pubkey not found in request body",
			});
		}

		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.WebAuthn,
			authMethodId,
			// We want to use the CBOR encoding here to retain as much information as possible
			// about the COSE (public) key.
			authMethodPubkey: authMethodPubkey as string,
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

export async function webAuthnVerifyToFetchPKPsHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		RegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	try {
		let { authMethodId } = req.body;

		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.WebAuthn,
			idForAuthMethod: authMethodId,
		});
		console.info("Fetched PKPs with WebAuthn", {
			pkps: pkps,
		});
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error("Unable to fetch PKPs for given WebAuthn", { err });
		return res.status(500).json({
			error: "Unable to fetch PKPs for given WebAuthn",
		});
	}
}

// Generate default username given timestamp, using timestamp format YYYY-MM-DD HH:MM:SS)
function generateDefaultUsername(): string {
	const date = new Date();
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();

	return `Usernameless user (${year}-${month}-${day} ${hours}:${minutes}:${seconds})`;
}

function generateUsernameForOptions(username?: string): string {
	return !!username ? username : generateDefaultUsername();
}
