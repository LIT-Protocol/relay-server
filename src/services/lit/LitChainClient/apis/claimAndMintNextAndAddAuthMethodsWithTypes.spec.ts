import { describe, expect, test } from "bun:test";
import { env } from "config/env";
import { createLitContracts } from "../utils/createLitContracts";
import { claimAndMintNextAndAddAuthMethodsWithTypes } from "./claimAndMintNextAndAddAuthMethodsWithTypes";

describe("LitChainClient", () => {
  test("claimAndMintNextAndAddAuthMethodsWithTypes", async () => {
    const { pkpNftContract } = createLitContracts(env.NETWORK);

    // Get mint cost
    const mintCost = await pkpNftContract.read.mintCost();
    console.log("Mint cost", Number(mintCost));

    const tx = await claimAndMintNextAndAddAuthMethodsWithTypes({
      derivedKeyId:
        "d8ed9605dd8b149982fedc4fd5b2097600fa592ea987580419a397d9f76bd04e",
      signatures: [
        {
          r: "0x5ad9ef4b86073752835fe22892656a3b9c22b1bbbfa5e1d2b53154ba1ed62bce",
          s: "0x32854d9dd249272f9816a9f17fe8cb09d00addad939aa9c20a47bcc600ecbdaa",
          v: 28,
        },
        {
          r: "0x1d75603a9ddbc87ebab283cafbea777e592a9d4ef9fa1b09183a473a31732912",
          s: "0x5ff6886776c3d0ecf75348fb64f077a14584b55e951f3b1a664e71367aaf11a4",
          v: 28,
        },
        {
          r: "0x0391d6884faa412805e34c2ffee5ec6133ebf9951ab932a2d7b3807a657cbeea",
          s: "0x0d414fe29d3e921d265523de956e0a6f9ce8f565858204c7404e73e79c6c397b",
          v: 28,
        },
      ],
      authMethodType: 1,
      authMethodId: "0x",
      authMethodPubkey: "0x",
    });

    expect(tx.receipt.logs.length).toBeGreaterThan(0);
    expect(tx.hash).toBeDefined();
    expect(tx.decodedLogs.length).toBeGreaterThan(0);
  });
});
