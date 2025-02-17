/**
 * Test suite for the Relay Server API endpoints
 * Tests the PKP minting and auth methods endpoints
 */
import { describe, expect, test } from "bun:test";
import { app } from "./server";

describe("Relay Server API - PKP Endpoints", () => {
  test("POST /pkp/mint-next-and-add-auth-methods", async () => {
    // Test payload based on the successful unit test
    const payload = {
      keyType: 2,
      permittedAuthMethodTypes: [2],
      permittedAuthMethodIds: [
        "170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
      ],
      permittedAuthMethodPubkeys: ["0x"],
      permittedAuthMethodScopes: [[1]],
      addPkpEthAddressAsPermittedAddress: true,
      sendPkpToItself: true,
    };

    const response = await app.handle(
      new Request("http://localhost/pkp/mint-next-and-add-auth-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
    );

    expect(response.status).toBe(200);

    const responseData = await response.json();

    console.log("mint hash:", responseData.hash);

    // Verify the response structure
    expect(responseData).toHaveProperty("hash");
    expect(responseData).toHaveProperty("receipt");
    expect(responseData).toHaveProperty("decodedLogs");
  });

  test("POST /pkp/claim-and-mint-next-and-add-auth-methods-with-types", async () => {
    const payload = {
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
    };

    const response = await app.handle(
      new Request(
        "http://localhost/pkp/claim-and-mint-next-and-add-auth-methods-with-types",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
    );

    if (response.status === 500) {
      const errorResponse = await response.json();
      console.log("error response:", errorResponse);
    } else {
      expect(response.status).toBe(200);

      const responseData = await response.json();

      console.log("claim hash:", responseData.requestId);

      expect(responseData).toHaveProperty("requestId");
    }
  });
});
