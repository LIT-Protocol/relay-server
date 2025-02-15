import { Hash } from "viem";
import { GAS_LIMIT_ADJUSTMENT } from "../_config";

/**
 * Calls a contract method with adjusted gas overrides to handle Arbitrum Stylus contracts
 * @param contract The contract instance to call
 * @param methodName The name of the contract method to call
 * @param args The arguments to pass to the contract method
 * @param overrides Optional transaction overrides (e.g. value, gasLimit)
 * @returns A Promise that resolves to the transaction hash
 */
export async function callWithAdjustedOverrides<
  TContract extends {
    write: Record<string, (...args: any[]) => Promise<Hash>>;
  },
  TMethodName extends keyof TContract["write"],
  TArgs extends readonly unknown[],
  TOverrides extends Record<string, unknown> = Record<string, unknown>
>(
  contract: TContract,
  methodName: TMethodName & string,
  args: TArgs,
  overrides?: TOverrides
): Promise<Hash> {
  // Get the write function from the contract
  const writeFunction = contract.write[methodName];
  if (!writeFunction) {
    throw new Error(`Method ${methodName} not found on contract`);
  }

  // If overrides include a gas limit, adjust it
  if (overrides && typeof overrides === "object" && "gas" in overrides) {
    const currentGas = BigInt(overrides.gas as bigint | number);
    const adjustedGas =
      (currentGas * BigInt(GAS_LIMIT_ADJUSTMENT)) / BigInt(100);
    overrides = {
      ...overrides,
      gas: adjustedGas,
    };
  }

  // For contract methods that expect array arguments, we need to pass the first array argument
  // This handles cases where the contract method expects [arg1, arg2, ...] but we pass [[arg1, arg2, ...]]
  const contractArgs =
    Array.isArray(args) && args.length === 1 && Array.isArray(args[0])
      ? args[0]
      : args;

  // Call the contract method with the provided arguments and overrides
  return writeFunction(contractArgs, overrides);
}
