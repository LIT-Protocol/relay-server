import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { SendTxnRequest, SendTxnResponse } from "../../models";
import { getSigner } from "../../lit";
import { ethers } from "ethers";

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

		const fixedTxn = {
			...req.body.txn,
			gasLimit: (req.body.txn.gasLimit as any).hex,
			gasPrice: (req.body.txn.gasPrice as any).hex,
			value: (req.body.txn.value as any).hex,
		};

		console.log("fixed txn", fixedTxn);

		// get the address that signed the txn
		// to make sure the "from" matches and there's no funny business
		const txnWithoutSig = {
			...fixedTxn,
		};
		delete txnWithoutSig.r;
		delete txnWithoutSig.s;
		delete txnWithoutSig.v;
		delete txnWithoutSig.hash;
		delete txnWithoutSig.from;

		console.log("txnWithoutSig", txnWithoutSig);

		const serializedTxn = ethers.utils.serializeTransaction(txnWithoutSig);
		console.log("serializedTxn: ", serializedTxn);

		const fromViaSignature = ethers.utils.recoverAddress(serializedTxn, {
			r: req.body.txn.r!,
			s: req.body.txn.s!,
			v: req.body.txn.v!,
		});
		console.log("fromViaSignature", fromViaSignature);
		if (fromViaSignature !== from) {
			return res.status(500).json({
				error: "Invalid signature - the recovered signature does not match the from address on the txn",
			});
		}

		// Convert to TransactionRequest format
		const txnRequest = {
			to: req.body.txn.to,
			from: req.body.txn.from,
			nonce: req.body.txn.nonce,
			data: req.body.txn.data,
			value: req.body.txn.value,
			chainId: req.body.txn.chainId,
			type: req.body.txn.type || undefined,
		};

		console.log("created txn request");

		// estimate the gas
		// const gasLimit = await signer.provider.estimateGas(txnRequest);
		const gasLimit = await provider.send("eth_estimateGas", [txnRequest]);
		console.log("gasLimit", gasLimit);

		// then, send gas to fund the wallet
		const gasFundingTxn = await signer.sendTransaction({
			to: from,
			value: gasLimit,
		});
		console.log("gasFundingTxn", gasFundingTxn);
		// wait for confirmation
		await gasFundingTxn.wait();

		// send the txn
		const txn = await signer.provider.sendTransaction(serializedTxn);
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
