import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	AuthMethodVerifyRegistrationResponse,
	AuthMethodVerifyToFetchResponse,
	OTPAuthVerifyRegistrationRequest,
	OtpVerificationPayload,
} from "../../models";
import { getPKPsForAuthMethod, mintPKP } from "../../lit";
import fetch from "node-fetch";
import { utils } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";

export async function stytchOtpVerifyToMintHandler(
	req: Request<
		{},
		AuthMethodVerifyRegistrationResponse,
		OTPAuthVerifyRegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<
		AuthMethodVerifyRegistrationResponse,
		Record<string, any>,
		number
	>,
) {
	const { accessToken } = req.body;
	const tmpToken = (" " + accessToken).slice(1);
	let userId: string;
	let tokenBody: Record<string, unknown>;
	let orgId: string;
	try {
		tokenBody = parseJWT(tmpToken);
		const audience = (tokenBody['aud'] as string[])[0];
		if (!audience) {
			return res.status(401).json({
				error: "Unable to parse project Id from token",
			});
		}
		orgId = audience;

		if (tokenBody['sub']) {
			userId = tokenBody['sub'] as string;
		} else {
			return res.status(401).json({
				error: "Unable to parse user Id from token",
			});
		}
	} catch (e) {
		console.error("unable to verify OTP token ", e);
		return res.status(400).json({
			error: "Unable to verify OTP token",
		});
	}

	// mint PKP for user
	try {
		const authMethodId = utils.keccak256(toUtf8Bytes(`${userId.toLowerCase()}:${orgId.toLowerCase()}`));
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.OTP,
			authMethodId,
			authMethodPubkey: "0x",
		});
		console.info("Minting PKP OTP", {
			requestId: mintTx.hash,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for given OTP request", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for given OTP request",
		});
	}
}

export async function stytchOtpVerifyToFetchPKPsHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		OTPAuthVerifyRegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	const { accessToken } = req.body;

	const tmpToken = (" " + accessToken).slice(1);
	let userId: string;
	let orgId: string;
	let tokenBody: Record<string, unknown>;
	try {

		tokenBody = parseJWT(tmpToken);
		const audience = (tokenBody['aud'] as string[])[0];
		if (!audience) {
			return res.status(401).json({
				error: "Unable to parse project Id from token",
			});
		}
		orgId = audience;
		if (tokenBody['sub']) {
			userId = tokenBody['sub'] as string;
		} else {
			return res.status(401).json({
				error: "Unable to parse user Id from token",
			});
		}
	} catch (e) {
		console.error("unable to verify OTP token");
		return res.status(400).json({
			error: "Unable to verify OTP token",
		});
	}

	// fetch PKPs for user
	try {
		let idForAuthMethod: string;	
		idForAuthMethod = utils.keccak256(toUtf8Bytes(`${userId.toLowerCase()}:${orgId.toLowerCase()}`));
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.OTP,
			idForAuthMethod,
		});
		console.info("Fetched PKPs with OTP auth", {
			pkps: pkps,
		});
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error("Unable to fetch PKPs for given userId", { err });
		return res.status(500).json({
			error: "Unable to fetch PKPs for given user Id",
		});
	}
}

/**
 *
 * @param jwt token to parse
 * @returns {string}- userId contained within the token message
 */
function parseJWT(jwt: string): Record<string, unknown> {
	let parts = jwt.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid token length");
	}
	let body =  Buffer.from(parts[1], 'base64');
	let parsedBody: Record<string, unknown> = JSON.parse(body.toString('ascii'));
	console.log("JWT body: ", parsedBody);
	return parsedBody;
}
