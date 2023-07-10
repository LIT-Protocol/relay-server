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

const APP_ID = process.env.DISCORD_CLIENT_ID || "1123992466459217960";

// Verify Discord access token by fetching current user info
async function verifyAndFetchDiscordUserId(
	accessToken: string,
): Promise<string> {
	const meResponse = await fetch("https://discord.com/api/users/@me", {
		method: "GET",
		headers: {
			authorization: `Bearer ${accessToken}`,
		},
	});
	if (meResponse.ok) {
		const user = await meResponse.json();
		return user.id;
	} else {
		throw new Error("Unable to verify Discord account");
	}
}

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
	const { accessToken } = req.body;

	// verify access token by fetching user info
	let userId: string;
	try {
		userId = await verifyAndFetchDiscordUserId(accessToken);
		console.info("Successfully verified Discord account", {
			userId: userId,
		});
	} catch (err) {
		return res.status(400).json({
			error: "Unable to verify Discord account",
		});
	}

	// mint PKP for user
	try {
		const authMethodId = utils.keccak256(
			toUtf8Bytes(`${userId}:${APP_ID}`),
		);
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
	const { accessToken } = req.body;

	// verify access token by fetching user info
	let userId: string;
	try {
		userId = await verifyAndFetchDiscordUserId(accessToken);
		console.info("Successfully verified Discord account", {
			userId: userId,
		});
	} catch (err) {
		return res.status(400).json({
			error: "Unable to verify Discord account",
		});
	}

	// fetch PKP for user
	try {
		const idForAuthMethod = utils.keccak256(
			toUtf8Bytes(`${userId}:${APP_ID}`),
		);
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.Discord,
			idForAuthMethod,
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
