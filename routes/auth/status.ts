import { errors, providers } from "ethers";
import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { getPkpEthAddress, getPkpPublicKey, getProvider } from "../../lit";
import {
	AuthStatus,
	GetAuthStatusRequestParams,
	GetAuthStatusResponse,
} from "../../models";
import { getTokenIdFromTransferEvent } from "../../utils/receipt";
import axios from "axios";
import config from "../../config";

const safeBlockConfirmations = parseInt(
	process.env.SAFE_BLOCK_CONFIRMATIONS || "1",
);

export async function getAuthStatusHandler(
	req: Request<
		GetAuthStatusRequestParams,
		GetAuthStatusResponse,
		{},
		ParsedQs,
		Record<string, any>
	>,
	res: Response<GetAuthStatusResponse, Record<string, any>, number>,
) {
	// get requestId from params
	const { requestId } = req.params;
	const {uuid} = req.query;

	// query the chain using requestId as the txHash.
	const provider = getProvider();

	let mintReceipt: providers.TransactionReceipt;
	try {
		mintReceipt = await provider.waitForTransaction(
			requestId,
			safeBlockConfirmations,
			30000,
		); // 30000ms is the max we will wait for.
		console.log("mint PKP receipt", { mintReceipt });
	} catch (err: any) {
		console.error("Error waiting for transaction hash", {
			txHash: requestId,
			err,
		});

		if (err.code === errors.TIMEOUT) {
			return res.status(200).json({
				status: AuthStatus.InProgress,
			});
		}
		return res.status(500).json({
			error: "Unable to fetch status of request",
		});
	}

	console.debug(mintReceipt.logs);

	// Once tx hash received, fetch eth adddress from chain
	let tokenIdFromEvent: string;
	try {
		tokenIdFromEvent = await getTokenIdFromTransferEvent(mintReceipt);
	} catch (err) {
		console.error("Error fetching tokenId from receipt", {
			err,
		});
		return res.status(500).json({
			error: "Unable to fetch tokenId from receipt",
		});
	}

	try {
		const pkpEthAddress = await getPkpEthAddress(tokenIdFromEvent);
		const pkpPublicKey = await getPkpPublicKey(tokenIdFromEvent);

		const payeeAddresses = JSON.stringify([pkpEthAddress]);
		const {data: {queueId}} = await axios.post(`${config.baseUrl}/api/v2/add-users`, {
			payeeAddresses, uuid
		}, {
			headers: { 
				'api-key': config.apiKey, 
				'payer-secret-key': config.payerSecret, 
				'Content-Type': 'application/json'
			}
		});
		return res.status(200).json({
			queueId: queueId,
			status: AuthStatus.Succeeded,
			pkpTokenId: tokenIdFromEvent,
			pkpEthAddress,
			pkpPublicKey,
		});
	} catch (err) {
		console.error("Error fetching PKP information", {
			tokenIdFromEvent,
			err,
		});
		return res.status(500).json({
			error: "Unable to fetch PKP information",
		});
	}
}
