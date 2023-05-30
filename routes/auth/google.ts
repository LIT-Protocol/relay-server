import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	RegistrationRequest,
	AuthMethodVerifyRegistrationResponse,
	AuthMethodVerifyToFetchResponse,
} from "../../models";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { utils } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";
import { mintPKP, getPKPsForAuthMethod } from "../../lit";

// Mint PKP for verified Google account
export async function googleOAuthVerifyToMintHandler(
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
	// get idToken from body
	const { authMethodId } = req.body;
	
	// mint PKP for user
	try {
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.GoogleJwt,
			authMethodId,
			authMethodPubkey: "0x",
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
		RegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	// get idToken from body
	const { authMethodId } = req.body;

	// fetch PKPs for user
	try {
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.GoogleJwt,
			idForAuthMethod: authMethodId,
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
