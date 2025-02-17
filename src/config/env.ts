import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // ======= REQUIRED CONFIGURATION =======
    // Network & Chain
    NETWORK: z.enum(["datil-dev", "datil-test", "datil"]),
    LIT_TXSENDER_RPC_URL: z.string().url(),
    LIT_TXSENDER_PRIVATE_KEY: z.string().min(1),
    LOG_LEVEL: z.enum(["info", "debug", "warn", "error"]).default("info"),

    // ======= OPTIONAL CONFIGURATION =======
    // ---------- Network & Chain Settings ----------
    CHAIN_POLLING_INTERVAL_MS: z
      .string()
      .transform((val: string): number => Number(val))
      .default("200"),
    SAFE_BLOCK_CONFIRMATIONS: z
      .string()
      .transform((val: string): number => Number(val))
      .default("1"),
    MINT_TX_TIMEOUT_MS: z
      .string()
      .transform((val: string): number => Number(val))
      .default("30000")
      .describe("30 second timeout for minting transactions"),

    GAS_LIMIT_INCREASE_PERCENTAGE: z
      .string()
      .transform((val: string): number => Number(val))
      .default("15"),

    // ---------- RATE LIMITER ----------
    MAX_REQUESTS_PER_WINDOW: z
      .string()
      .transform((val: string): number => Number(val))
      .default("10")
      .describe("Limit each IP to 10 requests per window"),
    WINDOW_MS: z
      .string()
      .transform((val: string): number => Number(val))
      .default("10000")
      .describe("10 second window"),

    // ---------- Redis ----------
    REDIS_URL: z.string().url().default("redis://localhost:6379"),

    // ---------- Server Config ----------
    PORT: z
      .string()
      .transform((val: string): number => Number(val))
      .default("3001"),
    ENABLE_HTTPS: z
      .string()
      .transform((val: string): boolean => val === "true")
      .default("false"),
    RP_ID: z.string().default("localhost"),
    EXPECTED_ORIGINS: z
      .string()
      .transform((val: string): string[] => val.split(","))
      .default("http://localhost:3000"),

    // ---------- Features ----------
    ENABLE_CONFORMANCE: z
      .string()
      .transform((val: string): boolean => val === "true")
      .default("false"),

    // ---------- WebAuthn ----------
    WEBAUTHN_RP_NAME: z.string().default("Lit Protocol"),
    WEBAUTHN_TIMEOUT: z
      .string()
      .transform((val: string): number => Number(val))
      .default("6000"),
  },

  clientPrefix: "PUBLIC_",

  client: {
    // PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },

  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
