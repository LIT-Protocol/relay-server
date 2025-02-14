import { env } from "config/env";
import { createLitContracts } from "./LitContractClient";

export async function getPkpEthAddress(tokenId: string): Promise<string> {
  const { pkpNftContract } = createLitContracts(env.NETWORK);
  return pkpNftContract.getEthAddress(Number(tokenId));
}

export async function getPkpPublicKey(tokenId: string): Promise<string> {
  const { pkpNftContract } = createLitContracts(env.NETWORK);
  return pkpNftContract.getPubkey(Number(tokenId));
}
