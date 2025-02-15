import request from "supertest";
import express from "express";
import { ethers } from "ethers";
import { sendTxnHandler } from "../../../routes/auth/sendTxn";
import { getProvider } from "../../../lit";
import cors from "cors";
import { Sequencer } from "../../../lib/sequencer";

describe("sendTxn Integration Tests", () => {
	let app: express.Application;
	let provider: ethers.providers.JsonRpcProvider;

	beforeAll(async () => {
		// Set up provider
		provider = getProvider();
	});

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(cors());
		app.post("/send-txn", sendTxnHandler);
	});

	afterAll(async () => {
		// // Clean up provider and connections
		if (provider) {
			provider.removeAllListeners();
		}

		Sequencer.Instance.stop();
	});

	it("should successfully send gas and broadcast a transaction", async () => {
		// Create a new random wallet
		const wallet = ethers.Wallet.createRandom().connect(provider);

		const { chainId } = await provider.getNetwork();

		const unsignedTxn = {
			to: wallet.address,
			value: "0x0",
			gasPrice: await provider.getGasPrice(),
			nonce: await provider.getTransactionCount(wallet.address),
			chainId,
			data: "0x",
		};

		console.log("unsignedTxn", unsignedTxn);
		const txnForSimulation = {
			...unsignedTxn,
			gasPrice: ethers.utils.hexValue(unsignedTxn.gasPrice),
			nonce: ethers.utils.hexValue(unsignedTxn.nonce),
			chainId: ethers.utils.hexValue(chainId),
		};

		const stateOverrides = {
			[wallet.address]: {
				balance: "0xDE0B6B3A7640000", // 1 eth in wei
			},
		};

		const gasLimit = await provider.send("eth_estimateGas", [
			txnForSimulation,
			"latest",
			stateOverrides,
		]);

		const toSign = {
			...unsignedTxn,
			gasLimit,
		};

		console.log("toSign", toSign);

		// Sign the transaction
		const signedTxn = await wallet.signTransaction(toSign);
		console.log("signedTxn", signedTxn);
		const txn = ethers.utils.parseTransaction(signedTxn);

		console.log("sending txn request", txn);

		const response = await request(app)
			.post("/send-txn")
			.send({ txn })
			.expect("Content-Type", /json/)
			.expect(200);

		expect(response.body).toHaveProperty("requestId");
		expect(response.body.requestId).toMatch(/^0x[a-fA-F0-9]{64}$/); // Should be a transaction hash

		// Wait for transaction to be mined
		const txReceipt = await provider.waitForTransaction(
			response.body.requestId,
		);
		expect(txReceipt.status).toBe(1); // Transaction should be successful
	}, 30000); // Increase timeout to 30s since we're waiting for real transactions

	it("should reject transaction with invalid signature", async () => {
		// Create a new random wallet
		const wallet = ethers.Wallet.createRandom().connect(provider);
		const maliciousWallet = ethers.Wallet.createRandom().connect(provider);

		const { chainId } = await provider.getNetwork();

		// Create a transaction but try to use a different from address
		const unsignedTxn = {
			to: wallet.address,
			value: "0x0",
			gasPrice: await provider.getGasPrice(),
			nonce: await provider.getTransactionCount(wallet.address),
			chainId,
			data: "0x",
		};

		console.log("unsignedTxn", unsignedTxn);
		const txnForSimulation = {
			...unsignedTxn,
			gasPrice: ethers.utils.hexValue(unsignedTxn.gasPrice),
			nonce: ethers.utils.hexValue(unsignedTxn.nonce),
			chainId: ethers.utils.hexValue(chainId),
		};

		const stateOverrides = {
			[wallet.address]: {
				balance: "0xDE0B6B3A7640000", // 1 eth in wei
			},
		};

		const gasLimit = await provider.send("eth_estimateGas", [
			txnForSimulation,
			"latest",
			stateOverrides,
		]);

		const toSign = {
			...unsignedTxn,
			gasLimit,
		};

		console.log("toSign", toSign);

		// Sign with malicious wallet but keep original from address
		const signedTxn = await maliciousWallet.signTransaction(toSign);
		console.log("signedTxn", signedTxn);
		const txn = ethers.utils.parseTransaction(signedTxn);

		// Override the from address to be the original wallet
		txn.from = wallet.address;

		const response = await request(app)
			.post("/send-txn")
			.send({ txn })
			.expect("Content-Type", /json/)
			.expect(500);

		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toContain("Invalid signature");
	});

	it("should handle errors with invalid transaction parameters", async () => {
		// Create an invalid transaction missing required fields
		const invalidTxn = {
			to: "0x1234567890123456789012345678901234567890",
			// Missing other required fields
		};

		const response = await request(app)
			.post("/send-txn")
			.send({ txn: invalidTxn })
			.expect("Content-Type", /json/)
			.expect(500);

		expect(response.body).toHaveProperty("error");
	});
});
