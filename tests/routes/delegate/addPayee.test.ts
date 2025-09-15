import { describe, it, expect, beforeAll } from "@jest/globals";
import axios from "axios";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

describe("addPayeeHandler Load Test", () => {
	const API_KEY = process.env.TEST_LIT_RELAYER_API_KEY;
	const PAYER_SECRET = process.env.TEST_LIT_PAYER_SECRET_KEY;
	const BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

	beforeAll(async () => {
		if (!API_KEY || !PAYER_SECRET) {
			throw new Error(
				"TEST_LIT_RELAYER_API_KEY and TEST_LIT_PAYER_SECRET_KEY must be set in .env file",
			);
		}

		// Log the test wallet address so it can be funded
		const { deriveWallet } = await import(
			"../../../routes/delegate/register"
		);
		const testWallet = await deriveWallet(API_KEY!, PAYER_SECRET!);
		console.log("\n=== TEST WALLET INFO ===");
		console.log(`Wallet Address: ${testWallet.address}`);
		console.log(`Please ensure this wallet is funded on the network`);
		console.log("========================\n");
	});

	it("should handle concurrent requests without nonce collisions", async () => {
		const numRequests = parseInt(process.env.TEST_NUM_REQUESTS || "500");
		const promises: Promise<any>[] = [];
		const results: {
			success: boolean;
			error?: any;
			index: number;
			isNonceError?: boolean;
			data?: any;
		}[] = [];

		console.log(
			`Starting load test with ${numRequests} parallel requests...`,
		);

		// Generate unique addresses for each request to avoid conflicts
		const generateAddresses = (index: number) => {
			const addresses = [];
			for (let i = 0; i < 3; i++) {
				const wallet = ethers.Wallet.createRandom();
				addresses.push(wallet.address);
			}
			return addresses;
		};

		// Create all requests
		for (let i = 0; i < numRequests; i++) {
			const payeeAddresses = generateAddresses(i);

			const promise = axios
				.post(`${BASE_URL}/add-users`, payeeAddresses, {
					headers: {
						"api-key": API_KEY,
						"payer-secret-key": PAYER_SECRET,
						"Content-Type": "application/json",
					},
					timeout: 60000, // 60 second timeout
				})
				.then((response) => {
					console.log(`Request ${i} succeeded`);
					return { success: true, index: i, data: response.data };
				})
				.catch((error) => {
					const errorMessage =
						error.response?.data?.error || error.message;
					console.error(`Request ${i} failed:`, errorMessage);

					// Check for nonce-related errors
					const isNonceError =
						errorMessage.includes("nonce") ||
						errorMessage.includes("replacement fee too low") ||
						errorMessage.includes("already known");

					return {
						success: false,
						index: i,
						error: errorMessage,
						isNonceError,
					};
				});

			promises.push(promise);
		}

		// Wait for all requests to complete
		const startTime = Date.now();
		results.push(...(await Promise.all(promises)));
		const duration = Date.now() - startTime;

		// Analyze results
		const successful = results.filter((r) => r.success);
		const failed = results.filter((r) => !r.success);
		const nonceErrors = failed.filter((r) => r.isNonceError);
		const insufficientFunds = failed.filter((r) =>
			r.error?.includes("insufficient funds"),
		);
		const rateLimited = failed.filter(
			(r) => r.error?.includes("429") || r.error?.includes("rate limit"),
		);

		console.log("\n=== Load Test Results ===");
		console.log(`Total requests: ${numRequests}`);
		console.log(
			`Successful: ${successful.length} (${(
				(successful.length / numRequests) *
				100
			).toFixed(1)}%)`,
		);
		console.log(
			`Failed: ${failed.length} (${(
				(failed.length / numRequests) *
				100
			).toFixed(1)}%)`,
		);
		console.log(`  - Nonce errors: ${nonceErrors.length}`);
		console.log(`  - Insufficient funds: ${insufficientFunds.length}`);
		console.log(`  - Rate limited: ${rateLimited.length}`);
		console.log(
			`  - Other errors: ${
				failed.length -
				nonceErrors.length -
				insufficientFunds.length -
				rateLimited.length
			}`,
		);
		console.log(`Duration: ${(duration / 1000).toFixed(2)} seconds`);
		console.log(
			`Throughput: ${(numRequests / (duration / 1000)).toFixed(
				1,
			)} requests/second`,
		);
		console.log(
			`Avg response time: ${(duration / numRequests).toFixed(0)}ms`,
		);

		if (nonceErrors.length > 0) {
			console.log("\nSample nonce errors:");
			nonceErrors.slice(0, 3).forEach((e) => {
				console.log(`  - Request ${e.index}: ${e.error}`);
			});
		}

		// Test assertions
		expect(successful.length).toBeGreaterThan(0);

		// We expect some failures under heavy load, but not all nonce errors
		if (failed.length > 0) {
			const nonceErrorRate = nonceErrors.length / failed.length;
			console.log(
				`\nNonce error rate among failures: ${(
					nonceErrorRate * 100
				).toFixed(1)}%`,
			);

			// If more than 50% of failures are nonce errors, it's a systemic issue
			expect(nonceErrorRate).toBeLessThan(0.5);
		}

		// Success rate should be reasonable (at least 50% under load)
		const successRate = successful.length / numRequests;
		expect(successRate).toBeGreaterThan(0.5);
	}, 120000); // 2 minute timeout for the entire test
});
