import { _nagaDev, datil, datilDev, datilTest } from "@lit-protocol/contracts";
import { BlockchainClient, Ethers5Client } from "@ns5/blockchain";
import { env } from "config/env";
import { ethers as ethersV5 } from "ethers5";

// Due to the usage of arbitrum stylus contracts the gas limit is increased by 10% to avoid reverts due to out of gas errors
const GAS_LIMIT_INCREASE_PERCENTAGE = env.GAS_LIMIT_INCREASE_PERCENTAGE;
const GAS_LIMIT_ADJUSTMENT = ethersV5.BigNumber.from(100).add(
  GAS_LIMIT_INCREASE_PERCENTAGE
);

export type LitNetwork = string;

type NetworkContextType =
  | typeof datilDev
  | typeof datilTest
  | typeof datil
  | typeof _nagaDev;

export const NETWORK_CONTEXT_BY_NETWORK: Record<string, NetworkContextType> = {
  custom: _nagaDev,
  datil: datil,
  "datil-dev": datilDev,
  "datil-test": datilTest,
} as const;

export const LIT_CONTRACT_NAME = {
  PKPNFT: "PKPNFT",
  PKPHelper: "PKPHelper",
  PKPPermissions: "PKPPermissions",
} as const;

export const createLitContracts = (network: LitNetwork) => {
  // -- Create ethersV5 client
  const ethersV5Provider = new ethersV5.providers.JsonRpcProvider(
    env.LIT_TXSENDER_RPC_URL
  );
  const ethersV5Wallet = new ethersV5.Wallet(
    env.LIT_TXSENDER_PRIVATE_KEY,
    ethersV5Provider
  );

  const ethers5Client = new Ethers5Client(ethersV5Wallet);

  // -- Create network context
  const networkContext = NETWORK_CONTEXT_BY_NETWORK[network];

  if (!networkContext) {
    throw new Error(`Network "${network}" not found`);
  }

  // -- contracts
  const pkpNftContract = _initContract(
    networkContext,
    ethers5Client,
    LIT_CONTRACT_NAME.PKPNFT,
    network
  );

  const pkpHelperContract = _initContract(
    networkContext,
    ethers5Client,
    LIT_CONTRACT_NAME.PKPHelper,
    network
  );

  return {
    blockchainClient: ethers5Client,
    pkpNftContract,
    pkpHelperContract,
  };
};

/**
 * Calls a contract method with automatically adjusted gas limits
 * @param contract The ethers contract instance
 * @param method The contract method name
 * @param args Arguments for the contract method
 * @param overrides Optional transaction overrides
 * @param gasLimitAdjustment Optional gas limit adjustment factor
 * @returns The contract method call result
 */
export async function callWithAdjustedOverrides<T, K extends FunctionKeys<T>>(
  contract: T,
  methodName: K,
  args: T[K] extends (...args: infer A) => any ? A : never,
  overrides: ethersV5.CallOverrides = {},
  gasLimitAdjustment: ethersV5.BigNumber = GAS_LIMIT_ADJUSTMENT
): Promise<any> {
  // Check if the method exists on the contract
  if (!(methodName in (contract as any).functions)) {
    throw new Error(
      `Method ${String(methodName)} does not exist on the contract`
    );
  }

  // Adjust the gas limit
  const gasLimit =
    overrides.gasLimit ??
    (await _getAdjustedGasLimit(
      contract as any,
      methodName,
      args,
      overrides,
      gasLimitAdjustment
    ));

  // Call the contract method with adjusted overrides
  return (contract as any).functions[methodName](...args, {
    ...overrides,
    gasLimit,
  });
}

// ================================ Private functions ================================
function _initContract(
  networkContext: NetworkContextType,
  blockchainClient: BlockchainClient,
  contractName: keyof typeof LIT_CONTRACT_NAME,
  network: LitNetwork
) {
  if (network === "custom") {
    const data = networkContext as unknown as typeof _nagaDev;

    return blockchainClient.getContract(
      // @ts-ignore - we are using networkContext.json which has a different type,
      // but we also want to return types so we are borrowing from _nagaDev
      data[contractName].abi,
      // @ts-ignore - we are using networkContext.json which has a different type,
      // but we also want to return types so we are borrowing from _nagaDev
      data[contractName].address
    );
  }

  const data = networkContext.data.find(
    (item: { name: string }) => item.name === contractName
  );

  const contractData = data?.contracts[0];

  if (!contractData?.ABI || !contractData?.address_hash) {
    throw new Error(`Contract ${contractName} not found`);
  }

  const contract = blockchainClient.getContract(
    contractData.ABI,
    contractData.address_hash
  );
  return contract;
}

/**
 * Calculates an adjusted gas limit for a contract method call
 * @param contract The ethers contract instance
 * @param method The contract method name
 * @param args Arguments for the contract method
 * @param overrides Optional transaction overrides
 * @param gasLimitAdjustment Optional gas limit adjustment factor
 * @returns Adjusted gas limit as BigNumber
 */
async function _getAdjustedGasLimit<
  T extends ethersV5.Contract,
  K extends keyof T["functions"]
>(
  contract: T,
  method: K,
  args: Parameters<T["functions"][K]>,
  overrides: ethersV5.CallOverrides = {},
  gasLimitAdjustment: ethersV5.BigNumber = GAS_LIMIT_ADJUSTMENT
): Promise<ethersV5.BigNumber> {
  const gasLimit = await contract.estimateGas[method as string](
    ...args,
    overrides
  );
  // BigNumber uses integer math, so for example, to get a 10% increase,
  // we multiply it by 110 to get 10% more gas and then divide
  // by 100 to get the final gas limit
  return gasLimit.mul(gasLimitAdjustment).div(100);
}

// Create a utility type that extracts only the function keys from an object
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
