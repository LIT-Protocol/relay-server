import { env } from "config/env";

import {
  createPublicClient,
  createWalletClient,
  getContract as getViemContract,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getContractData } from "./getContractData";
import {
  chronicleYellowstone,
  LIT_CONTRACT_NAME,
  LitNetwork,
  NETWORK_CONTEXT_BY_NETWORK,
} from "../_config";

export const createLitContracts = (network: LitNetwork) => {
  const transport = http(env.LIT_TXSENDER_RPC_URL);
  const account = privateKeyToAccount(
    env.LIT_TXSENDER_PRIVATE_KEY as `0x${string}`
  );

  const publicClient = createPublicClient({
    chain: chronicleYellowstone,
    transport,
  });

  const walletClient = createWalletClient({
    chain: chronicleYellowstone,
    transport,
    account,
  });

  // -- Create network context
  const networkContext = NETWORK_CONTEXT_BY_NETWORK[network];

  if (!networkContext) {
    throw new Error(`Network "${network}" not found`);
  }

  const pkpNftContractData = getContractData(
    networkContext,
    LIT_CONTRACT_NAME.PKPNFT,
    network
  );

  const pkpNftContract = getViemContract({
    address: pkpNftContractData.address as `0x${string}`,
    abi: pkpNftContractData.abi,
    client: { public: publicClient, wallet: walletClient },
  });

  const pkpHelperContractData = getContractData(
    networkContext,
    LIT_CONTRACT_NAME.PKPHelper,
    network
  );

  const pkpHelperContract = getViemContract({
    address: pkpHelperContractData.address as `0x${string}`,
    abi: pkpHelperContractData.abi,
    client: { public: publicClient, wallet: walletClient },
  });

  return {
    pkpNftContract,
    pkpHelperContract,
    publicClient,
  };
};
