import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	AuthSig,
	AuthMethodVerifyRegistrationResponse,
	AuthMethodVerifyToFetchResponse,
	RegistrationRequest,
} from "../../models";
import { utils } from "ethers";
import { mintPKP, getPKPsForAuthMethod } from "../../lit";

// Check that the message has been signed by the given address
function verifyAuthSig(authSig: AuthSig): boolean {
	const recoveredAddr = utils.verifyMessage(
		authSig.signedMessage,
		authSig.sig,
	);

	return recoveredAddr.toLowerCase() === authSig.address.toLowerCase();
}

// Mint PKP for verified Eth wallet
export async function walletVerifyToMintHandler(
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
	// get wallet auth sig from body
	const {authMethodId} = req.body;

	// mint PKP for user
	try {
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.EthWallet,
			authMethodId,
			authMethodPubkey: "0x",
		});
		console.info("Minting PKP with Eth wallet", {
			requestId: mintTx.hash,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for given Eth wallet", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for given Eth wallet",
		});
	}
}

// Fetch PKPs for verified Eth wallet
export async function walletVerifyToFetchPKPsHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		RegistrationRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	// get auth sig from body
	const {authMethodId} = req.body;

	// fetch PKP for user
	try {
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.EthWallet,
			idForAuthMethod: authMethodId,
		});
		console.info("Fetched PKPs with Eth wallet", {
			pkps: pkps,
		});
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error("Unable to fetch PKPs for given Eth wallet", { err });
		return res.status(500).json({
			error: "Unable to fetch PKPs for given Eth wallet",
		});
	}
}
