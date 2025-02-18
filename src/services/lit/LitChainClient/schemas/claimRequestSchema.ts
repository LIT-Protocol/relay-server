import { z } from "zod";
import { t } from "elysia";
import { toBigInt, toHexString } from "../../utils/transformers";

export const ClaimRequestSchema = z.object({
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
export type ClaimRequestInput = z.input<typeof ClaimRequestSchema>;

// The transformed output type (e.g., BigInt, etc.)
export type ClaimRequest = z.infer<typeof ClaimRequestSchema>;

export const tClaimRequestSchema = t.Object({
  derivedKeyId: t.String(),
  signatures: t.Array(
    t.Object({
      r: t.String(),
      s: t.String(),
      v: t.Number(),
    })
  ),
  authMethodType: t.Number(),
  authMethodId: t.String(),
  authMethodPubkey: t.String(),
});
