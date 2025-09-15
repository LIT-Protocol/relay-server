import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import * as Sentry from '@sentry/node';
import {
	getPkpEthAddress,
	getPKPsForAuthMethod,
	getSigner,
	mintPKP,
} from "../../lit";
import {
	AuthMethodVerifyToFetchResponse,
	FetchRequest,
	MintNextAndAddAuthMethodsRequest,
	MintNextAndAddAuthMethodsResponse,
} from "../../models";
import { ethers } from "ethers";
import { getPKPEthAddressFromPKPMintedEvent } from "../../utils/receipt";
import { executeTransactionWithRetry } from "../../lib/optimisticNonceManager";

export async function mintNextAndAddAuthMethodsHandler(
	req: Request<
		{},
		MintNextAndAddAuthMethodsResponse,
		MintNextAndAddAuthMethodsRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<
		MintNextAndAddAuthMethodsResponse,
		Record<string, any>,
		number
	>,
) {
	try {
		const signer = getSigner();
		const gasToFund = ethers.utils.parseEther("0.01");

		// Start minting PKP (don't await yet)
		console.info("Starting PKP mint...");
		const mintPromise = mintPKP(req.body);

		// Get the mint transaction hash immediately for response
		const mintTx = await mintPromise;
		const mintTxHash = mintTx.hash;
		console.info("PKP mint transaction submitted", {
			requestId: mintTxHash,
		});

		// // Start both operations in parallel:
		// // 1. Wait for mint confirmation to get PKP address
		// // 2. Prepare for gas funding transaction
		const receipt = await signer.provider.waitForTransaction(mintTxHash!);

		const pkpEthAddress = await getPKPEthAddressFromPKPMintedEvent(receipt);
		console.info("PKP address extracted", { pkpEthAddress });

		// Send gas funding transaction using optimistic nonce management
		// This returns immediately after transaction submission
		const gasFundingTxn = await executeTransactionWithRetry(
			signer,
			async (nonce: number) => {
				return await signer.sendTransaction({
					to: pkpEthAddress,
					value: gasToFund,
					nonce,
				});
			},
		);

		console.info("Gas funding transaction submitted", {
			gasFundingTxHash: gasFundingTxn.hash,
			pkpAddress: pkpEthAddress,
			fundingAmount: gasToFund.toString(),
		});

		// Return immediately - confirmations happen in background
		return res.status(200).json({
			requestId: mintTxHash,
		});
	} catch (err) {
		console.error("[mintNextAndAddAuthMethodsHandler] Unable to mint PKP", {
			err,
		});
		
		// Report to Sentry for 500 errors
		Sentry.captureException(err, {
			extra: {
				keyType: req.body.keyType,
				permittedAuthMethodTypes: req.body.permittedAuthMethodTypes,
				burnPkp: req.body.burnPkp,
			},
			tags: {
				component: 'mintNextAndAddAuthMethodsHandler',
				failure_type: 'mint_failed'
			}
		});
		
		return res.status(500).json({
			error: `[mintNextAndAddAuthMethodsHandler] Unable to mint PKP: ${
				(err as Error).message
			}`,
		});
	}
}

// Fetch PKPs for verified Discord account
export async function fetchPKPsHandler(
	req: Request<
		{},
		AuthMethodVerifyToFetchResponse,
		FetchRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToFetchResponse, Record<string, any>, number>,
) {
	// get Discord access token from body
	const { authMethodType, authMethodId } = req.body;

	try {
		const pkps = await getPKPsForAuthMethod({
			authMethodType: authMethodType,
			idForAuthMethod: authMethodId,
		});
		console.info("Fetched PKPs with auth type", authMethodType, {
			pkps: pkps,
		});
		return res.status(200).json({
			pkps: pkps,
		});
	} catch (err) {
		console.error(
			`Unable to fetch PKPs for given auth type ${authMethodType}`,
			{
				err,
			},
		);
		
		// Report to Sentry for 500 errors
		Sentry.captureException(err, {
			extra: {
				authMethodType,
				authMethodId,
			},
			tags: {
				component: 'fetchPKPsHandler',
				failure_type: 'fetch_failed'
			}
		});
		
		return res.status(500).json({
			error: `Unable to fetch PKPs for given auth method type: ${authMethodType}`,
		});
	}
}
