"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  LitRelayClient: () => LitRelayClient
});
module.exports = __toCommonJS(src_exports);
function getRelayURLByNetwork(network) {
  switch (network) {
    case "habanero":
      return "https://habanero.lit.dev";
    case "manzano":
      return "https://manzano.lit.dev";
  }
}
var LitRelayClient = class _LitRelayClient {
  /**
   * Create a new LitRelayClient instance. Requires that the payer is already registered.
   * and the the payer secret is known.
   * 
   * ```typescript
   * const client = new LitRelayClient('https://habanero.lit.dev', 'my-api-key', 'my-payer-secret');
   * ```
   * 
   * @param baseUrl
   * @param apiKey
   * @param payerSecret
   */
  constructor(baseUrl, apiKey, payerSecret) {
    this.payerSecret = void 0;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    if (payerSecret) {
      this.payerSecret = payerSecret;
    }
  }
  /**
   * Adds a new payee to the payer's delegation list.
   * 
   * ```typescript
   * const client = await LitRelayClient.connect('habanero', 'my-api-key', 'my-payer-secret');
   * const result = await client.addPayee('payee-wallet-address');
   * ```
   * @param payeeAddress
   * 
   * @returns Promise<{
   *  success: false;
   *  error: string;
   * } | {
   *  success: true;
   *  tokenId: string;
   * }>
   */
  async addPayee(payeeAddress) {
    if (!this.payerSecret) {
      throw new Error("Payer secret not set");
    }
    const res = await fetch(`${this.baseUrl}/delegate/user/payee`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
        "payer-secret-key": this.payerSecret
      },
      body: JSON.stringify([payeeAddress])
    });
    const data = await res.json();
    if (res.status !== 200) {
      return {
        success: false,
        error: data.error
      };
    }
    return {
      success: true,
      tokenId: data.tokenId
    };
  }
  /**
   * Registers a new payer with the Lit Relay server using the provided API key. Returns
   * a new LitRelayClient instance with the payer secret key.
   * 
   * ```typescript
   * const client = await LitRelayClient.register('habanero', 'my-api-key');
   * ```
   * 
   * @param network 
   * @param apiKey 
   * 
   * @returns LitRelayClient
   */
  static async register(network, apiKey) {
    if (network !== "habanero" && network !== "manzano") {
      throw new Error("Invalid network");
    }
    const baseUrl = getRelayURLByNetwork(network);
    const res = await fetch(`${baseUrl}/delegate/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      }
    });
    if (res.status !== 200) {
      throw new Error("Failed to register payer: request failed");
    }
    const data = await res.json();
    if (!data.payerSecretKey) {
      throw new Error("Failed to register payer: missing secret key");
    }
    return new _LitRelayClient(baseUrl, apiKey, data.payerSecretKey);
  }
  /**
   * Connects to the Relay server for the specified network using the provided API key and payer secret
   * and returns a new LitRelayClient instance.
   * 
   * ```typescript
   * const client = await LitRelayClient.connect('habanero', 'my-api-key', 'my-payer-secret');
   * ```
   * 
   * @param network 
   * @param apiKey 
   * @param payerSecret 
   * 
   * @returns LitRelayClient
   */
  static async connect(network, apiKey, payerSecret) {
    if (network !== "habanero" && network !== "manzano") {
      throw new Error("Invalid network");
    }
    const baseUrl = getRelayURLByNetwork(network);
    return new _LitRelayClient(baseUrl, apiKey, payerSecret);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LitRelayClient
});
