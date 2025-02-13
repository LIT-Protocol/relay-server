import dotenv from "dotenv";
import config from "../config";

// Load environment variables
dotenv.config();

// Set test environment variables if needed
process.env.NODE_ENV = "test";
