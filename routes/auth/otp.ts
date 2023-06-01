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

// TODO: UPDATE TO DEPLOYED DOMAIN
const AUTH_SERVER_URL =
	process.env.AUTH_SERVER_URL || "https://auth-api.litgateway.com/api/otp/verify";

async function verifyOtpJWT(jwt: string): Promise<OtpVerificationPayload> {
	const res = await fetch(AUTH_SERVER_URL, {
		redirect: "error",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			'api-key': '67e55044-10b1-426f-9247-bb680e5fe0c8_relayer'
		},
		body: JSON.stringify({
			token: jwt,
		}),
	});
	if (res.status < 200 || res.status > 299) {
		throw new Error("Error while verifying token on remote endpoint");
	}
	const respBody = await res.json();

	return respBody as OtpVerificationPayload;
}

export async function otpVerifyToMintHandler(
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
	let payload: OtpVerificationPayload | null;
	
	const tmpToken = (" " + accessToken).slice(1);
	let userId;
	let tokenBody: Record<string, unknown>;
	let orgId;
	try {
		tokenBody = parseJWT(tmpToken);
		orgId = (tokenBody.orgId as string).toLowerCase();
		let message: string = tokenBody['extraData'] as string;
		let contents = message.split("|");

		if (contents.length !== 2) {
			throw new Error("invalid message format in token message");
		}

		userId = contents[0];

		payload = await verifyOtpJWT(accessToken);
		if (payload.userId !== userId) {
			throw new Error("UserId does not match token contents");
		}
		console.info("Sucessful verification of OTP token", {
			userid: payload.userId,
		});
	} catch (e) {
		console.error("unable to verify OTP token ", e);
		return res.status(400).json({
			error: "Unable to verify OTP token",
		});
	}

	// mint PKP for user
	try {
		const authMethodId = utils.keccak256(toUtf8Bytes(`${userId}:${orgId}`));
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

export async function otpVerifyToFetchPKPsHandler(
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
	let userId;
	let tokenBody: Record<string, unknown>;
	try {
		tokenBody = parseJWT(tmpToken);

		let message: string = tokenBody.extraData as string;
		let contents = message.split("|");

		if (contents.length !== 2) {
			throw new Error("invalid message format in token message");
		}

		userId = contents[0];
		console.log(userId);
		const resp = await verifyOtpJWT(accessToken);
		if (resp.userId !== userId) {
			throw new Error("UserId does not match token contents");
		}
		console.info("Sucessful verification of OTP token", {
			userid: resp.userId,
		});
	} catch (e) {
		console.error("unable to verify OTP token");
		return res.status(400).json({
			error: "Unable to verify OTP token",
		});
	}

	// fetch PKPs for user
	try {
		let idForAuthMethod = userId as string;
		let orgId = (tokenBody.orgId as string).toLowerCase();
		idForAuthMethod = utils.keccak256(toUtf8Bytes(`${userId}:${orgId}`));
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
