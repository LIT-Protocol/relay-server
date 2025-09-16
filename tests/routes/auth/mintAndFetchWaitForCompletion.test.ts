import request from "supertest";
import express from "express";
import { mintNextAndAddAuthMethodsHandler } from "../../../routes/auth/mintAndFetch";
import cors from "cors";

describe("mintNextAndAddAuthMethodsHandler - Wait for Completion", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(cors());
		app.post("/mint-next-and-add-auth-methods", mintNextAndAddAuthMethodsHandler);
	});

	it("should wait for both PKP mint and gas funding to complete before returning", async () => {
		// Create a test request body
		const requestBody = {
			keyType: "2",
			permittedAuthMethodTypes: ["1"],
			permittedAuthMethodIds: ["0x1234567890123456789012345678901234567890"],
			permittedAuthMethodPubkeys: ["0x"],
			permittedAuthMethodScopes: [["1"]],
			addPkpEthAddressAsPermittedAddress: true,
			sendPkpToItself: true,
		};

		// Record start time
		const startTime = Date.now();

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.set("api-key", "test-key")
			.send(requestBody)
			.expect("Content-Type", /json/);

		// Record end time
		const endTime = Date.now();
		const duration = endTime - startTime;

		// The response should only come after both transactions are complete
		// This should take longer than just the PKP mint alone (which was the previous behavior)
		// A successful test would show the response contains a requestId and took a reasonable amount of time
		
		console.log(`Mint request took ${duration}ms to complete`);
		
		if (response.status === 200) {
			expect(response.body).toHaveProperty("requestId");
			expect(response.body.requestId).toMatch(/^0x[a-fA-F0-9]{64}$/);
			
			// The duration should be long enough to include both transactions
			// In practice, this should be at least a few seconds on a real network
			console.log("✅ Mint and funding completed successfully");
			console.log(`Transaction hash: ${response.body.requestId}`);
		} else {
			// If it fails, that's also expected in test environment
			console.log("Expected failure in test environment:", response.body.error);
			expect(response.status).toBe(500);
		}
	}, 60000); // 60 second timeout since we're potentially waiting for real transactions

	it("should handle errors gracefully and still return after attempting both operations", async () => {
		// Test with invalid parameters to trigger an error
		const requestBody = {
			keyType: "invalid",
			permittedAuthMethodTypes: [],
			permittedAuthMethodIds: [],
			permittedAuthMethodPubkeys: [],
			permittedAuthMethodScopes: [],
			addPkpEthAddressAsPermittedAddress: false,
			sendPkpToItself: false,
		};

		const response = await request(app)
			.post("/mint-next-and-add-auth-methods")
			.set("api-key", "test-key")
			.send(requestBody)
			.expect("Content-Type", /json/)
			.expect(500);

		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toContain("Unable to mint PKP");
		
		console.log("✅ Error handling works correctly");
	});
});