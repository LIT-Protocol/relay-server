import { z } from "zod";
import {
  toBigInt,
  toBigIntArray,
  toHexStringArray,
  toBigIntMatrix,
  toBoolean,
} from "../../utils/transformers";

export const mintRequestSchema = z.object({
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
export type MintRequestInput = z.input<typeof mintRequestSchema>;

// The transformed output type (e.g., BigInt, etc.)
export type MintRequest = z.infer<typeof mintRequestSchema>;
