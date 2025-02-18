import { z } from "zod";
import { t } from "elysia";

export const WebAuthnRequestSchema = z.object({
  username: z.string().optional(),
  url: z.string(),
});

// Define two types:
// The raw input type (e.g., number, string, etc.)
export type WebAuthnRequestInput = z.input<typeof WebAuthnRequestSchema>;

// The transformed output type (e.g., BigInt, etc.)
export type WebAuthnRequest = z.infer<typeof WebAuthnRequestSchema>;

export const tWebAuthnRequestSchema = t.Object({
  username: t.Optional(t.String()),
  url: t.Optional(t.String()),
});
