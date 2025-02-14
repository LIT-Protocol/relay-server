/**
 * Receipt utility functions
 */

import { ethers } from "ethers";
import type { TransactionReceipt, Log } from "@ethersproject/abstract-provider";

const TRANSFER_EVENT_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/**
 * Extracts the token ID from a transfer event in a transaction receipt
 * @param receipt Transaction receipt to parse
 * @returns The token ID from the transfer event
 */
export async function getTokenIdFromTransferEvent(
  receipt: TransactionReceipt
): Promise<string> {
  // Filter for the Transfer event
  const transferEventLog = receipt.logs.find((log: Log) => {
    return log.topics.length > 0 && log.topics[0] === TRANSFER_EVENT_SIGNATURE;
  });

  // Validation
  if (!transferEventLog) {
    throw new Error("No Transfer event found in receipt");
  }

  if (transferEventLog.topics.length < 3) {
    throw new Error("Transfer event does not have enough topics");
  }

  return transferEventLog.topics[3];
} 