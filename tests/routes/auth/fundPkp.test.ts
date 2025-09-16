import request from "supertest";
import express from "express";
import { ethers } from "ethers";
import { fundPkpHandler } from "../../../routes/auth/fundPkp";
import { getProvider } from "../../../lit";
import cors from "cors";

describe("fundPkp Integration Tests", () => {
	let app: express.Application;
	let provider: ethers.providers.JsonRpcProvider;

	beforeAll(async () => {
		provider = getProvider();
	});

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(cors());
		app.post("/fund-pkp", fundPkpHandler);
	});

	afterAll(async () => {
		if (provider) {
			provider.removeAllListeners();
		}
	});

	it("should reject request without valid Vincent API key", async () => {
		const testAddress = ethers.Wallet.createRandom().address;

		const response = await request(app)
			.post("/fund-pkp")
			.set("api-key", "invalid-key")
			.send({ ethAddress: testAddress })
			.expect("Content-Type", /json/)
			.expect(403);

		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toContain("Unauthorized");
	});

	it("should reject request without API key header", async () => {
		const testAddress = ethers.Wallet.createRandom().address;

		const response = await request(app)
			.post("/fund-pkp")
			.send({ ethAddress: testAddress })
			.expect("Content-Type", /json/)
			.expect(403);

		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toContain("Unauthorized");
	});

	it("should reject request without ethAddress parameter", async () => {
		const response = await request(app)
			.post("/fund-pkp")
			.set("api-key", process.env.LIT_VINCENT_RELAYER_API_KEY || "")
			.send({})
			.expect("Content-Type", /json/)
			.expect(400);

		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toContain("Missing required parameter: ethAddress");
	});

	it("should reject request with invalid ethereum address format", async () => {
		const response = await request(app)
			.post("/fund-pkp")
			.set("api-key", process.env.LIT_VINCENT_RELAYER_API_KEY || "")
			.send({ ethAddress: "invalid-address" })
			.expect("Content-Type", /json/)
			.expect(400);

		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toContain("Invalid ethereum address format");
	});

	it("should return success message if address already has funds", async () => {
		// Use an address that we know has funds (the signer address)
		const { getSigner } = await import("../../../lit");
		const signer = getSigner();
		const signerAddress = await signer.getAddress();

		const response = await request(app)
			.post("/fund-pkp")
			.set("api-key", process.env.LIT_VINCENT_RELAYER_API_KEY || "")
			.send({ ethAddress: signerAddress })
			.expect("Content-Type", /json/)
			.expect(200);

		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toContain("already has funds");
		expect(response.body).toHaveProperty("currentBalance");
	});

	it("should successfully fund an address with zero balance", async () => {
		// Create a random address that will have zero balance
		const randomWallet = ethers.Wallet.createRandom();
		const testAddress = randomWallet.address;

		// Verify the address has zero balance initially
		const initialBalance = await provider.getBalance(testAddress);
		expect(initialBalance.isZero()).toBe(true);

		const response = await request(app)
			.post("/fund-pkp")
			.set("api-key", process.env.LIT_VINCENT_RELAYER_API_KEY || "")
			.send({ ethAddress: testAddress })
			.expect("Content-Type", /json/)
			.expect(200);

		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toContain("Successfully funded");
		expect(response.body).toHaveProperty("txHash");
		expect(response.body).toHaveProperty("fundedAmount");
		expect(response.body).toHaveProperty("recipientAddress");
		expect(response.body.fundedAmount).toBe("0.01");
		expect(response.body.recipientAddress).toBe(testAddress);
		expect(response.body.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

		// Wait for transaction to be mined and verify the balance
		const txReceipt = await provider.waitForTransaction(response.body.txHash);
		expect(txReceipt.status).toBe(1);

		// Check that the address now has the funded amount
		const finalBalance = await provider.getBalance(testAddress);
		expect(finalBalance.eq(ethers.utils.parseEther("0.01"))).toBe(true);
	}, 30000); // Increase timeout since we're waiting for real transactions

	it("should handle multiple consecutive funding requests properly", async () => {
		// Create two random addresses
		const address1 = ethers.Wallet.createRandom().address;
		const address2 = ethers.Wallet.createRandom().address;

		// Fund first address
		const response1 = await request(app)
			.post("/fund-pkp")
			.set("api-key", process.env.LIT_VINCENT_RELAYER_API_KEY || "")
			.send({ ethAddress: address1 })
			.expect("Content-Type", /json/)
			.expect(200);

		expect(response1.body.message).toContain("Successfully funded");

		// Fund second address
		const response2 = await request(app)
			.post("/fund-pkp")
			.set("api-key", process.env.LIT_VINCENT_RELAYER_API_KEY || "")
			.send({ ethAddress: address2 })
			.expect("Content-Type", /json/)
			.expect(200);

		expect(response2.body.message).toContain("Successfully funded");

		// Verify both transactions succeeded
		const receipt1 = await provider.waitForTransaction(response1.body.txHash);
		const receipt2 = await provider.waitForTransaction(response2.body.txHash);
		expect(receipt1.status).toBe(1);
		expect(receipt2.status).toBe(1);

		// Verify both addresses have the correct balance
		const balance1 = await provider.getBalance(address1);
		const balance2 = await provider.getBalance(address2);
		expect(balance1.eq(ethers.utils.parseEther("0.01"))).toBe(true);
		expect(balance2.eq(ethers.utils.parseEther("0.01"))).toBe(true);
	}, 45000);
});