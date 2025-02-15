import { Hex, TransactionReceipt } from "viem";
import { DecodedLog } from "./utils/decodeLogs";

export type LitTxRes = {
  hash: Hex;
  receipt: TransactionReceipt;
  decodedLogs: DecodedLog[];
};
