import { z } from "zod";
import { t } from "elysia";

import {
  toBigInt,
  toBigIntArray,
  toHexStringArray,
  toBigIntMatrix,
  toBoolean,
} from "../../utils/transformers";

export const MintRequestSchema = z.object({
  keyType: toBigInt,
  permittedAuthMethodTypes: toBigIntArray,
  permittedAuthMethodIds: toHexStringArray,
  permittedAuthMethodPubkeys: toHexStringArray,
  permittedAuthMethodScopes: toBigIntMatrix,
  addPkpEthAddressAsPermittedAddress: toBoolean,
  sendPkpToItself: toBoolean,
});

// Define two types:
// The raw input type (e.g., number, string, etc.)
export type MintRequestInput = z.input<typeof MintRequestSchema>;

// The transformed output type (e.g., BigInt, etc.)
export type MintRequest = z.infer<typeof MintRequestSchema>;

export const tMintRequestSchema = t.Object({
  keyType: t.Number(),
  permittedAuthMethodTypes: t.Array(t.Number()),
  permittedAuthMethodIds: t.Array(t.String()),
  permittedAuthMethodPubkeys: t.Array(t.String()),
  permittedAuthMethodScopes: t.Array(t.Array(t.Number())),
  addPkpEthAddressAsPermittedAddress: t.Boolean(),
  sendPkpToItself: t.Boolean(),
});
