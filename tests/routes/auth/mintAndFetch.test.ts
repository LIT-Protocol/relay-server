import { describe, it, expect, beforeAll } from "@jest/globals";
import axios from "axios";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

describe("mintNextAndAddAuthMethodsHandler Load Test", () => {
	const API_KEY = process.env.TEST_LIT_RELAYER_API_KEY;
	const BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

	beforeAll(async () => {
		if (!API_KEY) {
			throw new Error(
				"TEST_LIT_RELAYER_API_KEY must be set in .env file",
			);
		}

		if (!process.env.LIT_TXSENDER_PRIVATE_KEY) {
			throw new Error(
				"LIT_TXSENDER_PRIVATE_KEY must be set in .env file",
			);
		}

		// Log the transaction sender wallet address so it can be funded
		const { getSigner } = await import("../../../lit");
		const txSender = getSigner();
		console.log("\n=== TRANSACTION SENDER INFO ===");
		console.log(`TX Sender Address: ${txSender.address}`);
		console.log(`This wallet sends PKP mint and gas funding transactions`);
		console.log(`Please ensure this wallet is funded on the network`);
		console.log("===================================\n");
	});

	it("should handle concurrent mint requests without nonce collisions", async () => {
		const numRequests = parseInt(process.env.TEST_NUM_REQUESTS || "50"); // Lower default since minting is expensive
		const promises: Promise<any>[] = [];
		const results: {
			success: boolean;
			error?: any;
			index: number;
			isNonceError?: boolean;
			data?: any;
		}[] = [];

		console.log(
			`Starting mint load test with ${numRequests} parallel requests...`,
		);

		// Generate unique auth methods for each request
		const generateAuthMethod = (index: number) => {
			const randomWallet = ethers.Wallet.createRandom();
			return {
				keyType: "2",
				permittedAuthMethodTypes: ["1"], // Ethereum auth method
				permittedAuthMethodIds: [`0x${randomWallet.address.slice(2)}`], // Remove 0x prefix
				permittedAuthMethodPubkeys: [
					`0x${randomWallet.publicKey.slice(2)}`,
				], // Remove 0x prefix
				permittedAuthMethodScopes: [["1"]],
				addPkpEthAddressAsPermittedAddress: true,
				sendPkpToItself: true,
				burnPkp: false,
			};
		};

		// Create all requests
		for (let i = 0; i < numRequests; i++) {
			const authMethodData = generateAuthMethod(i);

			const promise = axios
				.post(
					`${BASE_URL}/mint-next-and-add-auth-methods`,
					authMethodData,
					{
						headers: {
							"api-key": API_KEY,
							"Content-Type": "application/json",
						},
						timeout: 120000, // 2 minute timeout per request
					},
				)
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

		console.log("\n=== Mint Load Test Results ===");
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
				3,
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

		if (successful.length > 0) {
			console.log("\nSample successful responses:");
			successful.slice(0, 2).forEach((s) => {
				console.log(
					`  - Request ${s.index}: requestId ${s.data?.requestId}`,
				);
			});
		}

		if (failed.length > 0) {
			console.log("\nSample failed responses:");
			failed.slice(0, 3).forEach((f) => {
				console.log(`  - Request ${f.index}: ${f.error}`);
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

		// Success rate should be reasonable (at least 80% for 50 requests)
		const successRate = successful.length / numRequests;
		console.log(`\nOverall success rate: ${(successRate * 100).toFixed(1)}%`);
		expect(successRate).toBeGreaterThan(0.8);
	}, 300000); // 5 minute timeout for the entire test
});
