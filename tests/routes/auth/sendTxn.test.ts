import request from "supertest";
import express from "express";
import { ethers } from "ethers";
import { sendTxnHandler } from "../../../routes/auth/sendTxn";
import {
	getPkpEthAddress,
	getPkpPublicKey,
	getProvider,
	mintPKP,
} from "../../../lit";
import cors from "cors";
import { Sequencer } from "../../../lib/sequencer";
import { getTokenIdFromTransferEvent } from "../../../utils/receipt";
import { LitNodeClientNodeJs } from "@lit-protocol/lit-node-client-nodejs";
import { LitNetwork } from "@lit-protocol/constants";
import {
	createSiweMessage,
	generateAuthSig,
	LitActionResource,
	LitPKPResource,
	LitAbility,
} from "@lit-protocol/auth-helpers";

describe("sendTxn Integration Tests", () => {
	let app: express.Application;
	let provider: ethers.providers.JsonRpcProvider;
	let litNodeClient: LitNodeClientNodeJs;
	beforeAll(async () => {
		// Set up provider
		provider = getProvider();
		// connect to lit so we can sign the txn
		litNodeClient = new LitNodeClientNodeJs({
			litNetwork: process.env.NETWORK as LitNetwork,
			debug: false,
		});
		await litNodeClient.connect();
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

		litNodeClient.disconnect();
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

	it("should successfully send gas and broadcast a transaction using PKP signer", async () => {
		// Create a new random address to use for PKP auth
		const authWallet = ethers.Wallet.createRandom();

		// mint a PKP
		const pkpTx = await mintPKP({
			keyType: "2",
			permittedAuthMethodTypes: ["1"],
			permittedAuthMethodIds: [authWallet.address],
			permittedAuthMethodPubkeys: ["0x"],
			permittedAuthMethodScopes: [["1"]],
			addPkpEthAddressAsPermittedAddress: true,
			sendPkpToItself: true,
		});
		const receipt = await provider.waitForTransaction(pkpTx.hash!);
		const tokenIdFromEvent = await getTokenIdFromTransferEvent(receipt);
		const pkpEthAddress = await getPkpEthAddress(tokenIdFromEvent);
		const pkpPublicKey = await getPkpPublicKey(tokenIdFromEvent);

		const { chainId } = await provider.getNetwork();

		const unsignedTxn = {
			to: authWallet.address,
			value: "0x0",
			gasPrice: await provider.getGasPrice(),
			nonce: await provider.getTransactionCount(pkpEthAddress),
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
			[pkpEthAddress]: {
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
		const rsTx = await ethers.utils.resolveProperties(toSign);
		const serializedTxnToHash = ethers.utils.serializeTransaction(rsTx);
		console.log("serializedTxnToHash", serializedTxnToHash);
		const msgHash = ethers.utils.keccak256(serializedTxnToHash); // as specified by ECDSA
		const msgBytesToSign = ethers.utils.arrayify(msgHash); // create binary hash

		const authSigToSign = await createSiweMessage({
			uri: "https://example.com",
			expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
			resources: [
				{
					resource: new LitPKPResource(tokenIdFromEvent),
					ability: LitAbility.PKPSigning,
				},
			],
			walletAddress: authWallet.address,
			nonce: await litNodeClient.getLatestBlockhash(),
			litNodeClient,
		});

		const authSig = await generateAuthSig({
			signer: authWallet,
			toSign: authSigToSign,
		});

		console.log("token id from event", tokenIdFromEvent);

		const sessionSigs = await litNodeClient.getPkpSessionSigs({
			authMethods: [
				{
					authMethodType: 1,
					accessToken: JSON.stringify(authSig),
				},
			],
			pkpPublicKey,
			chain: "ethereum",
			resourceAbilityRequests: [
				{
					resource: new LitPKPResource(tokenIdFromEvent.substring(2)),
					ability: LitAbility.PKPSigning,
				},
			],
			expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 mins
		});

		// sign the txn
		const signingResult = await litNodeClient.pkpSign({
			pubKey: pkpPublicKey,
			sessionSigs,
			toSign: msgBytesToSign,
		});

		console.log("signingResult", signingResult);
		const signedTxn = ethers.utils.serializeTransaction(
			toSign,
			signingResult.signature,
		);
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
	}, 30000);

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
