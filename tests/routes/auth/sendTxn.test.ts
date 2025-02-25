import request from "supertest";
import express from "express";
import { ethers } from "ethers";
import { sendTxnHandler } from "../../../routes/auth/sendTxn";
import {
	getPkpEthAddress,
	getPkpPublicKey,
	getProvider,
	getSigner,
	mintCapacityCredits,
	mintPKP,
	getContractFromJsSdk,
} from "../../../lit";
import cors from "cors";
import { Sequencer } from "../../../lib/sequencer";
import { getTokenIdFromTransferEvent } from "../../../utils/receipt";
import { LitNodeClientNodeJs } from "@lit-protocol/lit-node-client-nodejs";
import { LIT_NETWORK_VALUES, LIT_ABILITY } from "@lit-protocol/constants";
import {
	createSiweMessage,
	generateAuthSig,
	LitActionResource,
	LitPKPResource,
} from "@lit-protocol/auth-helpers";
import {
	estimateGasWithBalanceOverride,
	txnToBytesToSign,
} from "../../../utils/eth";

describe("sendTxn Integration Tests", () => {
	let app: express.Application;
	let provider: ethers.providers.JsonRpcProvider;
	let litNodeClient: LitNodeClientNodeJs;
	beforeAll(async () => {
		// Set up provider
		provider = getProvider();
		// connect to lit so we can sign the txn
		litNodeClient = new LitNodeClientNodeJs({
			litNetwork: process.env.NETWORK as LIT_NETWORK_VALUES,
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

	it("should successfully send gas and broadcast a transaction with that gas, from a random wallet", async () => {
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

		const gasLimit = await estimateGasWithBalanceOverride({
			provider,
			txn: unsignedTxn,
			walletAddress: wallet.address,
		});

		const toSign = {
			...unsignedTxn,
			gasLimit,
		};

		console.log("toSign", toSign);

		// Sign the transaction with the local ethers wallet
		const signedTxn = await wallet.signTransaction(toSign);
		console.log("signedTxn", signedTxn);
		const txn = ethers.utils.parseTransaction(signedTxn);

		console.log("sending txn request", txn);

		const txnHashFromClient = txn.hash;

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

		// check that the txn hash is the same as the one from the client
		expect(response.body.requestId).toBe(txnHashFromClient);
	}, 30000); // Increase timeout to 30s since we're waiting for real transactions

	it("should successfully send gas and broadcast a transaction using PKP signer", async () => {
		// Create a new random address to use for PKP auth
		const provider = getProvider();
		const authWallet = ethers.Wallet.createRandom().connect(provider);

		// mint a PKP
		const pkpTx = await mintPKP({
			keyType: "2",
			permittedAuthMethodTypes: ["1"],
			permittedAuthMethodIds: [authWallet.address],
			permittedAuthMethodPubkeys: ["0x"],
			permittedAuthMethodScopes: [["1"]],
			addPkpEthAddressAsPermittedAddress: false,
			sendPkpToItself: true,
		});
		const receipt = await provider.waitForTransaction(pkpTx.hash!);
		const tokenIdFromEvent = await getTokenIdFromTransferEvent(receipt);
		const pkpEthAddress = await getPkpEthAddress(tokenIdFromEvent);
		const pkpPublicKey = await getPkpPublicKey(tokenIdFromEvent);

		const signer = await getSigner();
		const rateLimitNft = await mintCapacityCredits({
			signer,
			daysFromNow: 2,
		});
		// console.log("rate limit nft", rateLimitNft);
		const { capacityTokenId } = rateLimitNft!;
		// transfer the rate limit nft to the pkp address
		const rateLimitNftContract = await getContractFromJsSdk(
			process.env.NETWORK as LIT_NETWORK_VALUES,
			"RateLimitNFT",
			signer,
		);
		const rateLimitNftTransferTx =
			await rateLimitNftContract.functions.transferFrom(
				await signer.getAddress(),
				pkpEthAddress,
				capacityTokenId,
			);
		const rateLimitNftTransferReceipt = await rateLimitNftTransferTx.wait();
		// console.log(
		// 	"rate limit nft transfer receipt",
		// 	rateLimitNftTransferReceipt,
		// );

		const { chainId } = await provider.getNetwork();

		const unsignedTxn = {
			to: authWallet.address,
			value: "0x0",
			gasPrice: await provider.getGasPrice(),
			nonce: await provider.getTransactionCount(pkpEthAddress),
			chainId,
			data: "0x",
		};

		const gasLimit = await estimateGasWithBalanceOverride({
			provider,
			txn: unsignedTxn,
			walletAddress: pkpEthAddress,
		});

		const toSign = {
			...unsignedTxn,
			gasLimit,
		};

		const msgBytesToSign = await txnToBytesToSign(toSign);

		const authSigToSign = await createSiweMessage({
			uri: "https://example.com",
			expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
			resources: [
				{
					resource: new LitPKPResource(tokenIdFromEvent),
					ability: LIT_ABILITY.PKPSigning,
				},
			],
			walletAddress: await authWallet.getAddress(),
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
					ability: LIT_ABILITY.PKPSigning,
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
		const txnHashFromClient = txn.hash;

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

		// check that the txn hash is the same as the one from the client
		expect(response.body.requestId).toBe(txnHashFromClient);
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

		const gasLimit = await estimateGasWithBalanceOverride({
			provider,
			txn: unsignedTxn,
			walletAddress: wallet.address,
		});

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
