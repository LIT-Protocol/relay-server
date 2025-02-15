import { _nagaDev, datil, datilDev, datilTest } from "@lit-protocol/contracts";
import { env } from "config/env";
import { Chain } from "viem";

/**
 * Due to the usage of arbitrum stylus contracts,
 * the gas limit is increased by 10% to avoid reverts due to out of gas errors
 */
const GAS_LIMIT_INCREASE_PERCENTAGE = env.GAS_LIMIT_INCREASE_PERCENTAGE;
export const GAS_LIMIT_ADJUSTMENT = BigInt(100 + GAS_LIMIT_INCREASE_PERCENTAGE);

export type LitNetwork = string;

export type NetworkContextType =
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
  PubkeyRouter: "PubkeyRouter",
  PKPNFT: "PKPNFT",
  PKPHelper: "PKPHelper",
  PKPPermissions: "PKPPermissions",
} as const;

export const chronicleYellowstone: Chain = {
  id: 175188,
  name: "Chronicle Yellowstone - Lit Protocol Testnet",
  nativeCurrency: {
    name: "Test LPX",
    symbol: "tstLPX",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://yellowstone-rpc.litprotocol.com/"],
      webSocket: [],
    },
    public: {
      http: ["https://yellowstone-rpc.litprotocol.com/"],
      webSocket: [],
    },
  },
  blockExplorers: {
    default: {
      name: "Yellowstone Explorer",
      url: "https://yellowstone-explorer.litprotocol.com/",
    },
  },
};
