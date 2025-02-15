import { z } from "zod";
import { toBigInt, toHexString } from "../../utils/transformers";

export const claimRequestSchema = z.object({
  derivedKeyId: toHexString,
  signatures: z.array(
    z.object({
      r: toHexString,
      s: toHexString,
      v: z.number(),
    })
  ),
  authMethodType: toBigInt,
  authMethodId: toHexString,
  authMethodPubkey: toHexString,
});

// Define two types:
// The raw input type (e.g., number, string, etc.)
export type ClaimRequestInput = z.input<typeof claimRequestSchema>;

// The transformed output type (e.g., BigInt, etc.)
export type ClaimRequest = z.infer<typeof claimRequestSchema>;
