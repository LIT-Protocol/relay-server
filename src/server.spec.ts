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

    console.log("response:", response);

    expect(response.status).toBe(200);

    const responseData = await response.json();

    // Verify the response structure
    expect(responseData).toHaveProperty("hash");
    expect(responseData).toHaveProperty("receipt");
    expect(responseData).toHaveProperty("decodedLogs");
    console.log("responseData:", responseData);
  });

  // test("POST /pkp/mint-next-and-add-auth-methods - Invalid payload", async () => {
  //   const invalidPayload = {
  //     keyType: "invalid", // Should be a number
  //     permittedAuthMethodTypes: "invalid", // Should be an array
  //   };

  //   const response = await app
  //     .handle(
  //       new Request("http://localhost/pkp/mint-next-and-add-auth-methods", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify(invalidPayload),
  //       })
  //     );

  //   expect(response.status).toBe(500);
  // });
});
