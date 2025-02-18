import { env } from "config/env";
import { createLitContracts } from "../LitChainClient/utils/createLitContracts";

/**
 * Retrieves the Ethereum address for a given PKP token ID
 * @param tokenId - The ID of the PKP token
 * @returns The Ethereum address as a hex string
 */
export async function getPkpEthAddress(tokenId: string): Promise<string> {
  const { pkpNftContract } = createLitContracts(env.NETWORK);
  return pkpNftContract.read.getEthAddress([BigInt(tokenId)]);
}

/**
 * Retrieves the public key for a given PKP token ID
 * @param tokenId - The ID of the PKP token
 * @returns The public key as a hex string
 */
export async function getPkpPublicKey(tokenId: string): Promise<string> {
  const { pkpNftContract } = createLitContracts(env.NETWORK);
  return pkpNftContract.read.getPubkey([BigInt(tokenId)]);
}
