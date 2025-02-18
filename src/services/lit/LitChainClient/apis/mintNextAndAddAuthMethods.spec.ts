import { describe, expect, test } from "bun:test";
import { mintNextAndAddAuthMethods } from "./mintNextAndAddAuthMethods";

describe("LitChainClient", () => {
  test("mintNextAndAddAuthMethods", async () => {
    const tx = await mintNextAndAddAuthMethods({
      keyType: 2,
      permittedAuthMethodTypes: [2],
      permittedAuthMethodIds: [
        "170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
      ],
      permittedAuthMethodPubkeys: ["0x"],
      permittedAuthMethodScopes: [[1]],
      addPkpEthAddressAsPermittedAddress: true,
      sendPkpToItself: true,
    });

    expect(tx.receipt.logs.length).toBeGreaterThan(0);
    expect(tx.hash).toBeDefined();
    expect(tx.decodedLogs.length).toBeGreaterThan(0);
  });
});
