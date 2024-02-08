import { Request } from "express";
import { Response } from "express-serve-static-core";
import {
	AppleOAuthVerifyRegistrationRequest,
	AuthMethodType,
	AuthMethodVerifyRegistrationResponse,
} from "../../models";
import { ParsedQs } from "qs";
import { utils } from "elliptic";
import { mintPKP } from "../../lit";
import { toUtf8Bytes } from "ethers/lib/utils";

type AppleTokenPayload = any;

// Apple ID Token verification
async function verifyAppleIDToken(idToken: string): Promise<AppleTokenPayload> {
	// TODO: Implement Apple ID token verification here
	// For example, you might use Apple's public keys to verify the JWT signature
	// Then decode the payload and validate the audience and other claims
	// Return the payload if it's valid
}

// Mint PKP for verified Apple account
export async function appleOAuthVerifyToMintHandler(
	req: Request<
		{},
		AuthMethodVerifyRegistrationResponse,
		AppleOAuthVerifyRegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<
		AuthMethodVerifyRegistrationResponse,
		Record<string, any>,
		number
	>,
) {
	console.log(req.body);

	// get accessToken from body
	const { accessToken } = req.body;

	// verify Apple ID token
	let tokenPayload: AppleTokenPayload | null = null;
	try {
		tokenPayload = await verifyAppleIDToken(accessToken);
		console.info("Successfully verified Apple account", {
			userId: tokenPayload.sub,
		});
	} catch (err) {
		console.error("Unable to verify Apple account", { err });
		return res.status(400).json({
			error: "Unable to verify Apple account",
		});
	}

	// mint PKP for user
	try {
		const authMethodId = utils.keccak256(
			toUtf8Bytes(`${tokenPayload.sub}:${tokenPayload.aud}`),
		);
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.APPLE_JWT,
			authMethodId,
			authMethodPubkey: "0x",
		});
		console.info("Minting PKP with Apple auth", {
			requestId: mintTx.hash,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for given Apple account", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for given Apple account",
		});
	}
}
