import { env } from "config/env";
import { decodeEventLog, Log } from "viem";
import { getContractData } from "./getContractData";
import { LIT_CONTRACT_NAME, NETWORK_CONTEXT_BY_NETWORK } from "../_config";

export type DecodedLog = {
  eventName: string;
  args: {
    [key: string]: any;
  };
};

/**
 * Decodes event logs from Lit Protocol contract transactions
 * @param logs Array of transaction logs to decode
 * @returns Array of decoded logs with event names and parameters
 */
export const decodeLogs = async (logs: Log[]): Promise<DecodedLog[]> => {
  // Get network context for contract ABIs
  const networkContext = NETWORK_CONTEXT_BY_NETWORK[env.NETWORK];

  if (!networkContext) {
    throw new Error(`Network "${env.NETWORK}" not found`);
  }

  // Get contract data for each contract type
  const pkpNftData = getContractData(
    networkContext,
    LIT_CONTRACT_NAME.PKPNFT,
    env.NETWORK
  );
  const pkpHelperData = getContractData(
    networkContext,
    LIT_CONTRACT_NAME.PKPHelper,
    env.NETWORK
  );
  const pkpPermissionsData = getContractData(
    networkContext,
    LIT_CONTRACT_NAME.PKPPermissions,
    env.NETWORK
  );
  const pubkeyRouterData = getContractData(
    networkContext,
    LIT_CONTRACT_NAME.PubkeyRouter,
    env.NETWORK
  );

  // Map contract addresses to their ABIs
  const contractABIs = new Map<string, any>();
  contractABIs.set(pkpNftData.address.toLowerCase(), pkpNftData.abi);
  contractABIs.set(pkpHelperData.address.toLowerCase(), pkpHelperData.abi);
  contractABIs.set(
    pkpPermissionsData.address.toLowerCase(),
    pkpPermissionsData.abi
  );
  contractABIs.set(
    pubkeyRouterData.address.toLowerCase(),
    pubkeyRouterData.abi
  );

  // Decode each log
  const decodedLogs = logs.map((log) => {
    try {
      const abi = contractABIs.get(log.address.toLowerCase());
      if (!abi) {
        return {
          ...log,
          decoded: null,
          error: "No matching ABI found for address",
        };
      }

      const decoded = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      });

      return decoded;
    } catch (error) {
      return {
        ...log,
        decoded: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  return decodedLogs as DecodedLog[];
};
