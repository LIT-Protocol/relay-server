import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import {
	AuthMethodType,
	AuthSig,
	AuthMethodVerifyRegistrationResponse,
	AuthMethodVerifyToFetchResponse,
} from "../../models";
import { ethers, utils } from "ethers";
import { mintPKPWithSingleAuthMethod, getPKPsForAuthMethod } from "../../lit";
import { toUint8Array } from "js-base64";

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
		AuthSig,
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
	const authSig = req.body;

	// verify auth sig
	const verified: boolean = verifyAuthSig(authSig);
	if (verified) {
		console.info("Successfully verified authentication signature", {
			address: authSig.address,
		});
	} else {
		console.error("Unable to verify authentication signature", {
			address: authSig.address,
		});
		return res.status(400).json({
			error: "Unable to verify authentication signature",
		});
	}

	// mint PKP for user
	try {
		const authMethodId = ethers.utils.keccak256(
			toUint8Array(`${authSig.address}:lit`),
		);
		const mintTx = await mintPKPWithSingleAuthMethod({
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
		console.error("[Wallet] Unable to mint PKP for given Eth wallet", {
			err,
		});
		return res.status(500).json({
			error: "[Wallet] Unable to mint PKP for given Eth wallet",
		});
	}
}

// Fetch PKPs for verified Eth wallet
export async function walletVerifyToFetchPKPsHandler(
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

	// verify auth sig
	const verified: boolean = verifyAuthSig(authSig);
	if (verified) {
		console.info("Successfully verified authentication signature", {
			address: authSig.address,
		});
	} else {
		console.error("Unable to verify authentication signature", {
			address: authSig.address,
		});
		return res.status(400).json({
			error: "Unable to verify authentication signature",
		});
	}

	// fetch PKP for user
	try {
		const idForAuthMethod = ethers.utils.keccak256(
			toUint8Array(`${authSig.address}:lit`),
		);
		const pkps = await getPKPsForAuthMethod({
			authMethodType: AuthMethodType.EthWallet,
			idForAuthMethod,
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
