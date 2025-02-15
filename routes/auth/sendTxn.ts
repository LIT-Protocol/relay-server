import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { SendTxnRequest, SendTxnResponse } from "../../models";
import { getSigner } from "../../lit";
import { ethers } from "ethers";
import { Sequencer } from "../../lib/sequencer";

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

		const signature = {
			r: req.body.txn.r!,
			s: req.body.txn.s!,
			v: req.body.txn.v!,
		};

		console.log("txnWithoutSig", txnWithoutSig);
		const rsTx = await ethers.utils.resolveProperties(txnWithoutSig);
		const serializedTxn = ethers.utils.serializeTransaction(rsTx);
		console.log("serializedTxn: ", serializedTxn);

		const msgHash = ethers.utils.keccak256(serializedTxn); // as specified by ECDSA
		const msgBytes = ethers.utils.arrayify(msgHash); // create binary hash

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

		// // Convert to TransactionRequest format
		const txnRequest = {
			...fixedTxn,
			nonce: ethers.utils.hexValue(fixedTxn.nonce),
			value: ethers.utils.hexValue(fixedTxn.value),
			chainId: ethers.utils.hexValue(fixedTxn.chainId),
		};

		const stateOverrides = {
			[from]: {
				balance: "0xDE0B6B3A7640000", // 1 eth in wei
			},
		};

		console.log(
			"created txn request to estimate gas on server side",
			txnRequest,
		);

		// estimate the gas
		// const gasLimit = await signer.provider.estimateGas(txnRequest);
		const gasLimit = await provider.send("eth_estimateGas", [
			txnRequest,
			"latest",
			stateOverrides,
		]);
		console.log("gasLimit", gasLimit);
		const gasToFund = ethers.BigNumber.from(gasLimit).mul(rsTx.gasPrice);

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
