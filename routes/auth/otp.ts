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

const AUTH_SERVER_URL =
	process.env.AUTH_SERVER_URL || "http://127.0.0.1:8080/api/otp/verify";

async function verifyOtpJWT(jwt: string): Promise<OtpVerificationPayload> {
	const res = await fetch(AUTH_SERVER_URL, {
		redirect: "error",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
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
	const { jwt } = req.body;
	let payload: OtpVerificationPayload | null;

	const tmpToken = (" " + jwt).slice(1);
	let userId;

	try {
		userId = parseJWT(jwt);
		payload = await verifyOtpJWT(jwt);
		if (payload.userId !== userId) {
			throw new Error("UserId does not match token contents");
		}
		console.info("Sucessful verification of otp token", {
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
		const authMethodId = utils.keccak256(toUtf8Bytes(userId));
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.OTP,
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
	const { jwt } = req.body;
	let payload: OtpVerificationPayload | null;
	let userId;
	try {
		userId = parseJWT(jwt);
		payload = await verifyOtpJWT(jwt);
		if (payload.userId !== userId) {
			throw new Error("UserId does not match token contents");
		}
		console.info("Sucessful verification of otp token", {
			userid: payload.userId,
		});
	} catch (e) {
		console.error("unable to verify OTP token");
		return res.status(400).json({
			error: "Unable to verify OTP token",
		});
	}

	// fetch PKPs for user
	try {
		const idForAuthMethod = userId;
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.OTP,
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

/**
 *
 * @param jwt token to parse
 * @returns {string}- userId contained within the token message
 */
function parseJWT(jwt: string): string {
	let parts = jwt.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid token length");
	}
	let body =  Buffer.from(parts[1], 'base64');
	let parsedBody: Record<string, unknown> = JSON.parse(body.toString('ascii'));
	let message: string = parsedBody['extraData'] as string;
	let contents = message.split("|");

	if (contents.length !== 2) {
		throw new Error("invalid message format in token message");
	}

	return contents[0];
}
