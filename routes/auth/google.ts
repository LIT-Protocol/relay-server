import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	GoogleOAuthRequest,
	GoogleOAuthResponse,
} from "../../models";
import { TokenPayload } from "google-auth-library";
import { utils } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";
import { mintPKP } from "../../lit";

async function verifyIDToken(idToken: string): Promise<TokenPayload> {
	const response = await fetch(
		`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
		{
			method: "GET",
		},
	);
	return response.json();
}

export async function googleOAuthHandler(
	req: Request<
		{},
		GoogleOAuthResponse,
		GoogleOAuthRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<GoogleOAuthResponse, Record<string, any>, number>,
) {
	// get idToken from body
	const { idToken } = req.body;

	// verify idToken
	let tokenPayload: TokenPayload | null = null;
	try {
		tokenPayload = await verifyIDToken(idToken);
		console.info("Successfully verified user", {
			userId: tokenPayload.sub,
		});
	} catch (err) {
		console.error("Unable to verify Google idToken", { err });
		return res.status(400).json({
			error: "Unable to verify Google idToken",
		});
	}

	// mint PKP for user
	try {
		const idForAuthMethod = utils.keccak256(
			toUtf8Bytes(`${tokenPayload.sub}:${tokenPayload.aud}`),
		);
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.GoogleJwt,
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
