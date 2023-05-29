import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	AuthMethodVerifyRegistrationResponse,
	AuthMethodVerifyToFetchResponse,
	OTPAuthVerifyRegistrationRequest,
	OtpVerificationPayload,
	RegistrationRequest,
} from "../../models";
import { getPKPsForAuthMethod, mintPKP } from "../../lit";

export async function otpVerifyToMintHandler(
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
	const { authMethodId } = req.body;

	// mint PKP for user
	try {
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.OTP,
			authMethodId: authMethodId,
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
		RegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	let { authMethodId } = req.body;
	// fetch PKPs for user
	try {
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.OTP,
			idForAuthMethod: authMethodId,
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
