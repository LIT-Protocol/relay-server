import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { SendTxnRequest, SendTxnResponse } from "../../models";
import { getSigner } from "../../lit";
import { ethers } from "ethers";
import { Sequencer } from "../../lib/sequencer";
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
		const sequencer = Sequencer.Instance;
		const signer = getSigner();
		Sequencer.Wallet = signer;
		const provider = signer.provider as ethers.providers.JsonRpcProvider;
		const { from } = req.body.txn;

		console.log("original txn", req.body.txn);

		const fixedTxn = {
			...req.body.txn,
			gasLimit: (req.body.txn.gasLimit as any).hex,
			gasPrice: (req.body.txn.gasPrice as any).hex,
			value: (req.body.txn.value as any).hex,
			type: req.body.txn.type || undefined,
		};

		console.log("fixed txn", fixedTxn);

		// get the address that signed the txn
		const txnWithoutSig = removeTxnSignature(fixedTxn);
		const signature = {
			r: req.body.txn.r!,
			s: req.body.txn.s!,
			v: req.body.txn.v!,
		};

		console.log("txnWithoutSig", txnWithoutSig);

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
		// it must bound the gas price submitted plus or minus 10% of the current gas price
		const gasPrice = ethers.BigNumber.from(fixedTxn.gasPrice);
		if (
			gasPrice.lt(currentGasPrice.mul(9).div(10)) ||
			gasPrice.gt(currentGasPrice.mul(11).div(10))
		) {
			return res.status(500).json({
				error: "Invalid gas price - the gas price is not within 10% of the current gas price",
			});
		}

		const gasLimit = await estimateGasWithBalanceOverride({
			provider,
			txn: fixedTxn,
			walletAddress: from,
		});
		console.log("gasLimit", gasLimit);
		const gasToFund = ethers.BigNumber.from(gasLimit).mul(gasPrice);

		// then, send gas to fund the wallet using the sequencer
		const gasFundingTxn = await sequencer.wait({
			action: (...args) => {
				const paramsToFn = Object.assign(
					{},
					...args,
				) as ethers.providers.TransactionRequest;
				return signer.sendTransaction(paramsToFn);
			},
			params: [{ to: from, value: gasToFund }],
			transactionData: {},
		});
		console.log("gasFundingTxn", gasFundingTxn);
		// wait for confirmation
		await gasFundingTxn.wait();

		// serialize the txn with sig
		const serializedTxnWithSig = ethers.utils.serializeTransaction(
			txnWithoutSig,
			signature,
		);

		console.log("serializedTxnWithSig", serializedTxnWithSig);

		// send the txn
		const txn = await signer.provider.sendTransaction(serializedTxnWithSig);
		// wait for confirmation
		await txn.wait();

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
