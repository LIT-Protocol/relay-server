import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {  decode } from 'jsonwebtoken';

import {
	AuthMethodType,
	AuthMethodVerifyRegistrationResponse,
	AuthMethodVerifyToFetchResponse,
	DAuthVerifyRegistrationRequest,
} from "../../models";
import { utils } from "ethers";
import { toUtf8Bytes } from "ethers/lib/utils";
import { mintPKP, getPKPsForAuthMethod } from "../../lit";


// Mint PKP for verified DAuth JWT
export async function dAuthVerifyToMintHandler(
	req: Request<
		{},
		AuthMethodVerifyRegistrationResponse,
		DAuthVerifyRegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<
		AuthMethodVerifyRegistrationResponse,
		Record<string, any>,
		number
	>,
) {
	// get jwt from body
	const { jwt } = req.body;
	interface TokenPayload {
		sub: string
	}
	// verify DAuth JWT
	let tokenPayload;
	try {
		tokenPayload = await decode(jwt);
		if (tokenPayload && tokenPayload.sub) {
			console.info("Successfully verified DAuth JWT", {
				userId: tokenPayload.sub,
			});
		} else {
			throw new Error('Wrong Dauth JWT!')
		}
	} catch (err) {
		console.error("Unable to verify DAuth JWT", { err });
		return res.status(400).json({
			error: "Unable to verify DAuth JWT",
		});
	}

	// mint PKP for user
	try {
		const authMethodId = utils.keccak256(
			toUtf8Bytes(`${tokenPayload.sub}}`),
		);
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.DAuthJwt,
			authMethodId,
			authMethodPubkey: "0x",
		});
		console.info("Minting PKP with Google By DAuth", {
			requestId: mintTx.hash,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for given DAuth JWT", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for given DAuth JWT",
		});
	}
}

// Fetch PKPs for verified DAuth JWT
export async function dAuthVerifyToFetchPKPsHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		DAuthVerifyRegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	// get idToken from body
	const { jwt } = req.body;

	// verify idToken
	let tokenPayload;
	try {
		tokenPayload = await decode(jwt);
		if (tokenPayload && tokenPayload.sub) {
			console.info("Successfully verified DAuth JWT!", {
				userId: tokenPayload.sub,
			});
		} else {
			throw new Error('Wrong Dauth JWT!')
		}
	} catch (err) {
		console.error("Unable to verify DAuth JWT", { err });
		return res.status(400).json({
			error: "Unable to verify DAuth JWT",
		});
	}

	// fetch PKPs for user
	try {
		const idForAuthMethod = utils.keccak256(
			toUtf8Bytes(`${tokenPayload.sub}`),
		);
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.DAuthJwt,
			idForAuthMethod,
		});
		console.info("Fetched PKPs with DAuth JWT", {
			pkps: pkps,
		});
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error("Unable to fetch PKPs for given  DAuth JWT", { err });
		return res.status(500).json({
			error: "Unable to fetch PKPs for given  DAuth JWT",
		});
	}
}
