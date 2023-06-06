import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	DiscordOAuthVerifyRegistrationRequest,
	AuthMethodVerifyRegistrationResponse,
	AuthMethodVerifyToFetchResponse,
	RegistrationRequest,
	FetchRequest,
} from "../../models";
import { utils } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";
import { mintPKP, getPKPsForAuthMethod } from "../../lit";

// Mint PKP for verified Discord account
export async function mintPKPHandler(
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
	// get Discord access token from body
	const { authMethodType, authMethodId } = req.body;

	// mint PKP for user
	try {
		const mintTx = await mintPKP({
			authMethodType,
			authMethodId,
			authMethodPubkey: "0x",
		});
		console.info("Minting PKP with auth type", authMethodType, {
			requestId: mintTx.hash,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for auth type", authMethodType, { err });
		return res.status(500).json({
			error: `Unable to mint PKP for given auth method type ${authMethodType}`,
		});
	}
}

// Fetch PKPs for verified Discord account
export async function fetchPKPsHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		FetchRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	// get Discord access token from body
	const { authMethodType, authMethodId } = req.body;

	try {
		const pkps = await getPKPsForAuthMethod({
			authMethodType: authMethodType,
			idForAuthMethod: authMethodId,
		});
		console.info("Fetched PKPs with auth type", authMethodType, {
			pkps: pkps,
		});
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error(`Unable to fetch PKPs for given auth type ${authMethodType}`, {
			err,
		});
		return res.status(500).json({
			error: `Unable to fetch PKPs for given auth method type: ${authMethodType}`,
		});
	}
}
