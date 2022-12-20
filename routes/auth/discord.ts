import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	DiscordOAuthRequest,
	AuthMethodVerifyToMintResponse,
	AuthMethodVerifyToFetchResponse,
} from "../../models";
import { utils } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";
import { mintPKP, getPKPsForAuthMethod } from "../../lit";

const APP_ID = process.env.DISCORD_CLIENT_ID || "105287423965869266";

async function verifyAndFetchUserId(accessToken: string): Promise<string> {
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
		console.error("Unable to verify Discord access token", {
			status: meResponse.status,
			statusText: meResponse.statusText,
		});
		throw new Error("Unable to verify Discord access token");
	}
}

export async function discordOAuthVerifyToMintHandler(
	req: Request<
		{},
		AuthMethodVerifyToMintResponse,
		DiscordOAuthRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>,
) {
	// get Discord access token from body
	const { accessToken } = req.body;

	// verify access token by fetching user info
	let userId: string;
	try {
		userId = await verifyAndFetchUserId(accessToken);
	} catch (err) {
		return res.status(400).json({
			error: "Unable to verify Discord access token",
		});
	}

	// mint PKP for user
	try {
		const idForAuthMethod = utils.keccak256(
			toUtf8Bytes(`${userId}:${APP_ID}`),
		);
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.Discord,
			idForAuthMethod,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for user", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for user",
		});
	}
}

export async function discordOAuthVerifyToFetchHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		DiscordOAuthRequest,
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
		userId = await verifyAndFetchUserId(accessToken);
	} catch (err) {
		return res.status(400).json({
			error: "Unable to verify Discord access token",
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
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error("Unable to mint PKP for user", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for user",
		});
	}
}
