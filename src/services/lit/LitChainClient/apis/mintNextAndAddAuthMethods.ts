import { env } from "config/env";
import {
  MintRequestInput,
  MintRequestSchema,
} from "../schemas/MintRequestSchema";
import { callWithAdjustedOverrides } from "../utils/callWithAdjustedOverrides";
import { createLitContracts } from "../utils/createLitContracts";
import { decodeLogs } from "../utils/decodeLogs";
import { LitTxRes } from "../types";

/**
 * Mints a new Programmable Key Pair (PKP) with specified authentication methods.
 *
 * @param {MintRequestInput} request - The request object containing PKP minting parameters
 * @param {number} request.keyType - The type of key to mint
 * @param {number[]} request.permittedAuthMethodTypes - Array of permitted authentication method types
 * @param {string[]} request.permittedAuthMethodIds - Array of permitted authentication method IDs
 * @param {string[]} request.permittedAuthMethodPubkeys - Array of permitted authentication method public keys
 * @param {string[][]} request.permittedAuthMethodScopes - Array of scopes for each authentication method
 * @param {boolean} request.addPkpEthAddressAsPermittedAddress - Whether to add the PKP's Ethereum address as a permitted address
 * @param {boolean} request.sendPkpToItself - Whether to send the PKP to itself
 *
 * @returns {Promise<LitTxRes>} Object containing transaction hash, receipt, and decoded logs
 */
export async function mintNextAndAddAuthMethods(
  request: MintRequestInput
): Promise<LitTxRes> {
  const validatedRequest = MintRequestSchema.parse(request);

  const { pkpNftContract, pkpHelperContract, publicClient } =
    createLitContracts(env.NETWORK);

  // Get mint cost
  const mintCost = await pkpNftContract.read.mintCost();

  const hash = await callWithAdjustedOverrides(
    pkpHelperContract,
    "mintNextAndAddAuthMethods",
    [
      validatedRequest.keyType,
      validatedRequest.permittedAuthMethodTypes,
      validatedRequest.permittedAuthMethodIds,
      validatedRequest.permittedAuthMethodPubkeys,
      validatedRequest.permittedAuthMethodScopes,
      validatedRequest.addPkpEthAddressAsPermittedAddress,
      validatedRequest.sendPkpToItself,
    ],
    {
      value: mintCost,
    }
  );

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const decodedLogs = await decodeLogs(receipt.logs);

  return { hash, receipt, decodedLogs };
}
