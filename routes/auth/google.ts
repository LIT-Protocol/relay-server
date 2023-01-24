import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	GoogleOAuthRequest,
	AuthMethodVerifyToMintResponse,
	AuthMethodVerifyToFetchResponse,
} from "../../models";
import { TokenPayload } from "google-auth-library";
import { utils } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";
import { mintPKP, getPKPsForAuthMethod } from "../../lit";

const CLIENT_ID =
	process.env.GOOGLE_CLIENT_ID ||
	"355007986731-llbjq5kbsg8ieb705mo64nfnh88dhlmn.apps.googleusercontent.com";

// Validate given Google ID token
async function verifyIDToken(idToken: string): Promise<TokenPayload> {
	const response = await fetch(
		`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
		{
			method: "GET",
		},
	);
	return response.json();
}

// Mint PKP for verified Google account
export async function googleOAuthVerifyToMintHandler(
	req: Request<
		{},
		AuthMethodVerifyToMintResponse,
		GoogleOAuthRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>,
) {
	// get idToken from body
	const { idToken } = req.body;

	// verify Google ID token
	let tokenPayload: TokenPayload | null = null;
	try {
		tokenPayload = await verifyIDToken(idToken);
		console.info("Successfully verified Google account", {
			userId: tokenPayload.sub,
		});
	} catch (err) {
		console.error("Unable to verify Google account", { err });
		return res.status(400).json({
			error: "Unable to verify Google account",
		});
	}

	// mint PKP for user
	try {
		const idForAuthMethod = utils.keccak256(
			toUtf8Bytes(`${tokenPayload.sub}:${tokenPayload.aud}`),
		);
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.GoogleJwt,
			idForAuthMethod,
		});
		console.info("Minting PKP with Google auth", {
			requestId: mintTx.hash,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for given Google account", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for given Google account",
		});
	}
}

// Fetch PKPs for verified Google account
export async function googleOAuthVerifyToFetchPKPsHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		GoogleOAuthRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	// get idToken from body
	const { idToken } = req.body;

	// verify idToken
	let tokenPayload: TokenPayload | null = null;
	try {
		tokenPayload = await verifyIDToken(idToken);
		console.info("Successfully verified Google account", {
			userId: tokenPayload.sub,
		});
	} catch (err) {
		console.error("Unable to verify Google account", { err });
		return res.status(400).json({
			error: "Unable to verify Google account",
		});
	}

	// fetch PKPs for user
	try {
		const idForAuthMethod = utils.keccak256(
			toUtf8Bytes(`${tokenPayload.sub}:${tokenPayload.aud}`),
		);
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.GoogleJwt,
			idForAuthMethod,
		});
		console.info("Fetched PKPs with Google auth", {
			pkps: pkps,
		});
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error("Unable to fetch PKPs for given Google account", { err });
		return res.status(500).json({
			error: "Unable to fetch PKPs for given Google account",
		});
	}
}
