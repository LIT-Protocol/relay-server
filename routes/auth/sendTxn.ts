import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { SendTxnRequest, SendTxnResponse } from "../../models";
import { getSigner } from "../../lit";
import { ethers } from "ethers";
import { executeTransactionWithRetry } from "../../lib/optimisticNonceManager";
import {
	estimateGasWithBalanceOverride,
	removeTxnSignature,
	txnToBytesToSign,
} from "../../utils/eth";
// estimate gas, send gas, broadcast txn, return txn hash
export async function sendTxnHandler(
	req: Request<
		{},
		SendTxnResponse,
		SendTxnRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<SendTxnResponse, Record<string, any>, number>,
) {
	try {
		const signer = getSigner();
		const provider = signer.provider as ethers.providers.JsonRpcProvider;
		const { from } = req.body.txn;

		console.log("original txn", req.body.txn);

		// for some reason, the BigNumber objects don't deserialize properly
		// and instead come in as objects like this: { type: 'BigNumber', hex: '0x989680' }
		// so we need to deserialize them into BigNumber objects
		const fixedTxn = {
			...req.body.txn,
			gasLimit: ethers.BigNumber.from(req.body.txn.gasLimit),
			gasPrice: ethers.BigNumber.from(req.body.txn.gasPrice),
			value: ethers.BigNumber.from(req.body.txn.value),
			type: req.body.txn.type || undefined,
		};

		console.log("fixed txn", fixedTxn);

		// first, we need to remove the txn signature so that
		// we can get the address that signed the txn.
		// we will use this to ensure that we are only funding the address that
		// actually signed the txn
		const txnWithoutSig = removeTxnSignature(fixedTxn);
		const signature = {
			r: req.body.txn.r!,
			s: req.body.txn.s!,
			v: req.body.txn.v!,
		};
		// console.log("txnWithoutSig", txnWithoutSig);
		const msgBytes = await txnToBytesToSign(txnWithoutSig);
		const fromViaSignature = ethers.utils.recoverAddress(
			msgBytes,
			signature,
		);
		console.log("fromViaSignature", fromViaSignature);
		if (fromViaSignature !== from) {
			return res.status(500).json({
				error: "Invalid signature - the recovered signature does not match the from address on the txn",
			});
		}

		// check that the gas price is sane
		const currentGasPrice = await provider.getGasPrice();
		// it must bound the gas price submitted plus or minus the allowed percentage of the current gas price
		const ALLOWED_GAS_PRICE_DEVIATION_PERCENTAGE = 10; // 10%
		const gasPriceFromClient = ethers.BigNumber.from(fixedTxn.gasPrice);
		if (
			gasPriceFromClient.lt(
				currentGasPrice
					.mul(100 - ALLOWED_GAS_PRICE_DEVIATION_PERCENTAGE)
					.div(100),
			) ||
			gasPriceFromClient.gt(
				currentGasPrice
					.mul(100 + ALLOWED_GAS_PRICE_DEVIATION_PERCENTAGE)
					.div(100),
			)
		) {
			return res.status(500).json({
				error: `Invalid gas price - the gas price sent by the client of ${gasPriceFromClient.toString()} is not within ${ALLOWED_GAS_PRICE_DEVIATION_PERCENTAGE}% of the current gas price of ${currentGasPrice.toString()}`,
			});
		}

		// estimate the gas for the txn
		const gasLimit = ethers.BigNumber.from(
			await estimateGasWithBalanceOverride({
				provider,
				txn: fixedTxn,
				walletAddress: from,
			}),
		);
		console.log("gasLimit", gasLimit);

		// check that the gas limit from the txn they sent is within 10% of the gas limit we estimated
		const ALLOWED_GAS_LIMIT_DEVIATION_PERCENTAGE = 10; // 10%
		const gasLimitFromClient = ethers.BigNumber.from(fixedTxn.gasLimit);
		if (
			gasLimitFromClient.lt(
				gasLimit
					.mul(100 - ALLOWED_GAS_LIMIT_DEVIATION_PERCENTAGE)
					.div(100),
			) ||
			gasLimitFromClient.gt(
				gasLimit
					.mul(100 + ALLOWED_GAS_LIMIT_DEVIATION_PERCENTAGE)
					.div(100),
			)
		) {
			return res.status(500).json({
				error: `Invalid gas limit - the gas limit sent by the client of ${gasLimitFromClient.toString()} is not within ${ALLOWED_GAS_LIMIT_DEVIATION_PERCENTAGE}% of the gas limit we estimated of ${gasLimit.toString()}`,
			});
		}

		// use values from client because we already checked that they're within safe bounds
		const gasToFund =
			ethers.BigNumber.from(gasLimitFromClient).mul(gasPriceFromClient);

		// then, send gas to fund the wallet using executeTransactionWithRetry
		const gasFundingTxn = await executeTransactionWithRetry(
			signer,
			async (nonce: number) => {
				return await signer.sendTransaction({
					to: from,
					value: gasToFund,
					nonce
				});
			}
		);
		console.log("gasFundingTxn", gasFundingTxn);
		// wait for confirmation
		await gasFundingTxn.wait();

		// now, the wallet is funded.  serialize the original txn with sig
		// to a hex string, so we can broadcast it
		const serializedTxnWithSig = ethers.utils.serializeTransaction(
			txnWithoutSig,
			signature,
		);

		console.log("serializedTxnWithSig", serializedTxnWithSig);

		// broadcast the txn, don't wait for confirmation
		const txn = await signer.provider.sendTransaction(serializedTxnWithSig);

		console.info("Sent txn", {
			requestId: txn.hash,
		});
		return res.status(200).json({
			requestId: txn.hash,
		});
	} catch (err) {
		console.error("[sendTxnHandler] Unable to send txn", {
			err,
		});
		return res.status(500).json({
			error: `[sendTxnHandler] Unable to send txn ${JSON.stringify(err)}`,
		});
	}
}
