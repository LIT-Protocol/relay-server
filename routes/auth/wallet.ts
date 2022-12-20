import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	AuthSig,
	AuthMethodVerifyToMintResponse,
	AuthMethodVerifyToFetchResponse,
} from "../../models";
import { utils } from "ethers";
import { mintPKP, getPKPsForAuthMethod } from "../../lit";

function verifyAuthSig(authSig: AuthSig): boolean {
	const recoveredAddr = utils.verifyMessage(
		authSig.signedMessage,
		authSig.sig,
	);

	return recoveredAddr.toLowerCase() === authSig.address.toLowerCase();
}

export async function walletVerifyToMintHandler(
	req: Request<
		{},
		AuthMethodVerifyToMintResponse,
		AuthSig,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>,
) {
	// get wallet auth sig from body
	const authSig = req.body;

	// verify access token by fetching user info
	const verified: boolean = verifyAuthSig(authSig);
	if (!verified) {
		return res.status(400).json({
			error: "Unable to verify auth sig",
		});
	}

	// mint PKP for user
	try {
		const idForAuthMethod = authSig.address;
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.EthWallet,
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

export async function walletVerifyToFetchHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		AuthSig,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	// get auth sig from body
	const authSig = req.body;

	// verify access token by fetching user info
	const verified: boolean = verifyAuthSig(authSig);
	if (!verified) {
		return res.status(400).json({
			error: "Unable to verify auth sig",
		});
	}

	// fetch PKP for user
	try {
		const idForAuthMethod = authSig.address;
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.EthWallet,
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
