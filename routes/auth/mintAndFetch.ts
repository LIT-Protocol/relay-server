import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { getPKPsForAuthMethod, mintPKP } from "../../lit";
import {
	AuthMethodVerifyToFetchResponse,
	FetchRequest,
	MintNextAndAddAuthMethodsRequest,
	MintNextAndAddAuthMethodsResponse,
} from "../../models";

export async function mintNextAndAddAuthMethodsHandler(
	req: Request<
		{},
		MintNextAndAddAuthMethodsResponse,
		MintNextAndAddAuthMethodsRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<
		MintNextAndAddAuthMethodsResponse,
		Record<string, any>,
		number
	>,
) {
	// mint PKP for user
	try {
		const mintTx = await mintPKPV2(req.body);
		console.info("Minted PKP", {
			requestId: mintTx.hash,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("[mintNextAndAddAuthMethodsHandler] Unable to mint PKP", {
			err,
		});
		return res.status(500).json({
			error: `[mintNextAndAddAuthMethodsHandler] Unable to mint PKP ${JSON.stringify(
				err,
			)}`,
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
		console.error(
			`Unable to fetch PKPs for given auth type ${authMethodType}`,
			{
				err,
			},
		);
		return res.status(500).json({
			error: `Unable to fetch PKPs for given auth method type: ${authMethodType}`,
		});
	}
}
