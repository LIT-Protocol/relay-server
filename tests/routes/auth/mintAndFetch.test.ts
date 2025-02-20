import request from "supertest";
import express from "express";
import { mintNextAndAddAuthMethodsHandler } from "../../../routes/auth/mintAndFetch";
import { ethers } from "ethers";
import {
	getProvider,
	setSequencerWallet,
	getPkpNftContract,
} from "../../../lit";
import cors from "cors";
import { Sequencer } from "../../../lib/sequencer";
import config from "../../../config";

describe("mintNextAndAddAuthMethods Integration Tests", () => {
	let app: express.Application;
	let provider: ethers.providers.JsonRpcProvider;
	let signer: ethers.Wallet;

	beforeAll(async () => {
		// Set up provider and signer
		provider = getProvider();
		const privateKey = process.env.LIT_TXSENDER_PRIVATE_KEY!;
		signer = new ethers.Wallet(privateKey, provider);

		// Set up sequencer wallet
		await setSequencerWallet(signer);
	});

	afterAll(async () => {
		// // Clean up provider and connections
		if (provider) {
			provider.removeAllListeners();
		}

		Sequencer.Instance.stop();
	});

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(cors());
		app.post(
			"/mint-next-and-add-auth-methods",
			mintNextAndAddAuthMethodsHandler,
		);
	});

	it("should successfully mint a PKP and return a request ID", async () => {
		const requestBody = {
			keyType: "2",
			permittedAuthMethodTypes: ["2"],
			permittedAuthMethodIds: [
				"0x170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
			],
			permittedAuthMethodPubkeys: ["0x"],
			permittedAuthMethodScopes: [["1"]],
			addPkpEthAddressAsPermittedAddress: true,
			sendPkpToItself: true,
		};

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.send(requestBody)
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

	it("should handle errors with invalid parameters", async () => {
		const invalidRequestBody = {
			keyType: "2",
			permittedAuthMethodTypes: [], // non matching array lengths. this should have 1 element but it has none.
			permittedAuthMethodIds: [
				"0x170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
			],
			permittedAuthMethodPubkeys: ["0x"],
			permittedAuthMethodScopes: [["1"]],
			addPkpEthAddressAsPermittedAddress: true,
			sendPkpToItself: true,
		};

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.send(invalidRequestBody)
			.expect("Content-Type", /json/)
			.expect(500);

		expect(response.body).toHaveProperty("error");
	});

	it("should validate required request body parameters", async () => {
		const invalidRequestBody = {
			// Missing required parameters
			keyType: "2",
			permittedAuthMethodTypes: ["2"],
		};

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.send(invalidRequestBody)
			.expect("Content-Type", /json/)
			.expect(500);

		expect(response.body).toHaveProperty("error");
	});

	it("should successfully mint a PKP and send it to a specified address", async () => {
		// Generate a random address to send the PKP to
		const randomWallet = ethers.Wallet.createRandom();
		const sendToAddress = randomWallet.address;

		const requestBody = {
			keyType: "2",
			permittedAuthMethodTypes: ["2"],
			permittedAuthMethodIds: [
				"0x170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
			],
			permittedAuthMethodPubkeys: ["0x"],
			permittedAuthMethodScopes: [["1"]],
			addPkpEthAddressAsPermittedAddress: true,
			sendPkpToItself: false,
			burnPkp: false,
			sendToAddressAfterMinting: sendToAddress,
		};

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.send(requestBody)
			.expect("Content-Type", /json/)
			.expect(200);

		expect(response.body).toHaveProperty("requestId");
		expect(response.body.requestId).toMatch(/^0x[a-fA-F0-9]{64}$/); // Should be a transaction hash

		// Wait for transaction to be mined
		const txReceipt = await provider.waitForTransaction(
			response.body.requestId,
		);
		expect(txReceipt.status).toBe(1); // Transaction should be successful

		// Get the token ID from the transaction logs
		const pkpNft = getPkpNftContract(config.network);
		const mintEvent = txReceipt.logs.find((log) => {
			try {
				return pkpNft.interface.parseLog(log).name === "PKPMinted";
			} catch {
				return false;
			}
		});
		expect(mintEvent).toBeDefined();

		if (!mintEvent) {
			throw new Error(
				"Failed to find PKPMinted event in transaction logs",
			);
		}

		const tokenId = pkpNft.interface.parseLog(mintEvent).args.tokenId;
		expect(tokenId).toBeDefined();

		// Verify that the random address owns the NFT
		const owner = await pkpNft.ownerOf(tokenId);
		expect(owner.toLowerCase()).toBe(sendToAddress.toLowerCase());

		// get PKP eth address from the PKP NFT contract
		const pkpEthAddress = await pkpNft.getEthAddress(tokenId);
		expect(pkpEthAddress).toBeDefined();

		// check that the pkp has 0.001 eth
		const pkpBalance = await provider.getBalance(pkpEthAddress);
		console.log("pkpBalance", pkpBalance);
		expect(pkpBalance.toHexString()).toBe(
			ethers.utils.parseEther("0.001").toHexString(),
		);
	}, 30000); // Increase timeout to 30s since we're waiting for real transactions
});
