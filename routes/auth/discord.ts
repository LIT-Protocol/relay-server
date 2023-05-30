import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	DiscordOAuthVerifyRegistrationRequest,
	AuthMethodVerifyRegistrationResponse,
	AuthMethodVerifyToFetchResponse,
} from "../../models";
import { utils } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";
import { mintPKP, getPKPsForAuthMethod } from "../../lit";

const APP_ID = process.env.DISCORD_CLIENT_ID || "105287423965869266";

// Mint PKP for verified Discord account
export async function discordOAuthVerifyToMintHandler(
	req: Request<
		{},
		AuthMethodVerifyRegistrationResponse,
		DiscordOAuthVerifyRegistrationRequest,
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
	const { authMethodId } = req.body;

	// mint PKP for user
	try {

		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.Discord,
			authMethodId,
			authMethodPubkey: "0x",
		});
		console.info("Minting PKP with Discord auth", {
			requestId: mintTx.hash,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for given Discord account", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for given Discord account",
		});
	}
}

// Fetch PKPs for verified Discord account
export async function discordOAuthVerifyToFetchPKPsHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		DiscordOAuthVerifyRegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	// get Discord access token from body
	const { authMethodId } = req.body;

	try {
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.Discord,
			idForAuthMethod: authMethodId,
		});
		console.info("Fetched PKPs with Discord auth", {
			pkps: pkps,
		});
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error("Unable to fetch PKPs for given Discord account", {
			err,
		});
		return res.status(500).json({
			error: "Unable to fetch PKPs for given Discord account",
		});
	}
}
