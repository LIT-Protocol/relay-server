import dotenv from "dotenv";
import config from "../config";

// Load environment variables
dotenv.config();

// Set test environment variables if needed
process.env.NODE_ENV = "test";

// Validate required environment variables for integration tests
const requiredEnvVars = ["LIT_TXSENDER_RPC_URL", "LIT_TXSENDER_PRIVATE_KEY"];

requiredEnvVars.forEach((envVar) => {
	if (!process.env[envVar]) {
		throw new Error(
			`Required environment variable ${envVar} is not set. Please check your .env file.`,
		);
	}
});
