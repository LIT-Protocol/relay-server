import { z } from "zod";
import { Hex } from "viem";

/**
 * Ensures a hex string has '0x' prefix
 * @param value - The hex string to check
 * @returns The hex string with '0x' prefix
 */
export function hexPrefixed(value: string): Hex {
  return value.startsWith("0x") ? (value as Hex) : (`0x${value}` as Hex);
}

/**
 * Safely converts a value to BigInt, returns 0n if conversion fails
 */
function safeBigInt(value: string | number): bigint {
  try {
    if (typeof value === "string" && value.trim() === "") return 0n;
    return BigInt(value);
  } catch {
    return 0n;
  }
}

// Transform a number or string to a BigInt
// eg. "2" or 2 -> 2n
export const toBigInt = z
  .union([z.string(), z.number()])
  .transform((n) => safeBigInt(n));

// Transform a number/string or array of numbers/strings to an array of BigInts
// eg. "1" -> [1n]
// eg. [1, "2", 3] -> [1n, 2n, 3n]
export const toBigIntArray = z
  .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
  .transform((val) => {
    if (Array.isArray(val)) {
      return val.map(safeBigInt);
    }
    return [safeBigInt(val)];
  });

// Transform a string to a hex string type
// eg. "123" -> "0x123"
export const toHexString = z.string().transform((s) => hexPrefixed(s));

// Transform a string or array of strings to an array of hex strings
// eg. undefined -> ["0x"]
// eg. "123" -> ["0x123"]
// eg. ["123", "456"] -> ["0x123", "0x456"]
export const toHexStringArray = z
  .union([z.string(), z.array(z.string()), z.undefined()])
  .transform((val) => {
    if (!val) return [hexPrefixed("")];
    if (Array.isArray(val)) {
      return val.map(hexPrefixed);
    }
    return [hexPrefixed(val)];
  });

// Transform arrays of numbers/strings to arrays of arrays of BigInts
// eg. undefined -> [[]]
// eg. [[1, "2"], ["3", 4]] -> [[1n, 2n], [3n, 4n]]
export const toBigIntMatrix = z
  .union([z.array(z.array(z.union([z.string(), z.number()]))), z.undefined()])
  .transform((val) => {
    if (!val) return [[]];
    return val.map((inner) => inner.map(safeBigInt));
  });

// Transform undefined or boolean to boolean
// eg. undefined -> false
// eg. true -> true
export const toBoolean = z
  .union([z.boolean(), z.undefined()])
  .transform((val) => Boolean(val ?? false));
