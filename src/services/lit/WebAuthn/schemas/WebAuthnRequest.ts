import { z } from "zod";

export const webAuthnRequestSchema = z.object({
  username: z.string().optional(),
  url: z.string(),
});

// Define two types:
// The raw input type (e.g., number, string, etc.)
export type WebAuthnRequestInput = z.input<typeof webAuthnRequestSchema>;

// The transformed output type (e.g., BigInt, etc.)
export type WebAuthnRequest = z.infer<typeof webAuthnRequestSchema>;
