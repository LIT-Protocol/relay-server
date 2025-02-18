import { env } from "config/env";
import {
  ClaimRequestInput,
  ClaimRequestSchema,
} from "../schemas/ClaimRequestSchema";
import { LitTxRes } from "../types";
import { callWithAdjustedOverrides } from "../utils/callWithAdjustedOverrides";
import { createLitContracts } from "../utils/createLitContracts";
import { decodeLogs } from "../utils/decodeLogs";

/**
 * Claims and mints a PKP using derived key ID and signatures, then adds authentication methods.
 *
 * @param {ClaimRequestInput} request - The request object containing PKP claiming parameters
 * @param {string} request.derivedKeyId - The derived key ID for claiming
 * @param {Signature[]} request.signatures - Array of signatures required for claiming
 * @param {number} request.authMethodType - The type of authentication method to add
 * @param {string} request.authMethodId - The ID of the authentication method
 * @param {string} request.authMethodPubkey - The public key of the authentication method
 *
 * @returns {Promise<LitTxRes>} Object containing transaction hash, receipt, and decoded logs
 */
export async function claimAndMintNextAndAddAuthMethodsWithTypes(
  request: ClaimRequestInput
): Promise<LitTxRes> {
  const validatedRequest = ClaimRequestSchema.parse(request);
  const { pkpHelperContract, pkpNftContract, publicClient } =
    createLitContracts(env.NETWORK);

  // Get mint cost
  const mintCost = await pkpNftContract.read.mintCost();
  const ECDSA_SECP256K1 = 2;

  const AUTH_METHOD_SCOPE = {
    SIGN_ANYTHING: "1",
    PERSONAL_SIGN: "2",
  } as const;

  const claimMaterial = {
    keyType: ECDSA_SECP256K1,
    derivedKeyId: validatedRequest.derivedKeyId,
    signatures: validatedRequest.signatures,
  };

  const authMethodData = {
    keyType: ECDSA_SECP256K1,
    permittedIpfsCIDs: [],
    permittedIpfsCIDScopes: [],
    permittedAddresses: [],
    permittedAddressScopes: [],
    permittedAuthMethodTypes: [validatedRequest.authMethodType],
    permittedAuthMethodIds: [validatedRequest.authMethodId],
    permittedAuthMethodPubkeys: [validatedRequest.authMethodPubkey],
    permittedAuthMethodScopes: [[AUTH_METHOD_SCOPE.SIGN_ANYTHING]],
    addPkpEthAddressAsPermittedAddress: true,
    sendPkpToItself: true,
  };

  const hash = await callWithAdjustedOverrides(
    pkpHelperContract,
    "claimAndMintNextAndAddAuthMethodsWithTypes",
    [claimMaterial, authMethodData],
    {
      value: mintCost,
    }
  );

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const decodedLogs = await decodeLogs(receipt.logs);

  return { hash, receipt, decodedLogs };
}
