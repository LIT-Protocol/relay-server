/**
 * PKP API Tests
 * Tests PKP minting and fetching operations
 */

import { describe, expect, test } from "bun:test";
import { app } from "../../server";
import { AuthMethodType } from "../../types";

describe("PKP API", () => {
  test("POST /mint-next-and-add-auth-methods - should mint new PKP", async () => {
    const response = await app.handle(
      new Request("http://localhost/mint-next-and-add-auth-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": "test-key",
        },
        body: JSON.stringify({
          keyType: "2",
          permittedAuthMethodTypes: [AuthMethodType.WebAuthn],
          permittedAuthMethodIds: ["test-id"],
          permittedAuthMethodPubkeys: ["0x123"],
          permittedAuthMethodScopes: [["1"]],
          addPkpEthAddressAsPermittedAddress: true,
          sendPkpToItself: true,
        }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("requestId");
  });

  test("POST /fetch-pkps-by-auth-method - should fetch PKPs", async () => {
    const response = await app.handle(
      new Request("http://localhost/fetch-pkps-by-auth-method", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": "test-key",
        },
        body: JSON.stringify({
          authMethodType: AuthMethodType.WebAuthn,
          authMethodId: "test-id",
        }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("pkps");
  });
}); 