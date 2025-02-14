/**
 * WebAuthn API Tests
 * Tests WebAuthn registration and authentication
 */

import { describe, expect, test } from "bun:test";
import { app } from "../../server";

describe("WebAuthn API", () => {
  test("GET /auth/webauthn/generate-registration-options - should generate options", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/webauthn/generate-registration-options", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api-key": "test-key",
          "Origin": "http://localhost:3000"
        },
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("challenge");
    expect(data).toHaveProperty("rp");
    expect(data.rp).toHaveProperty("name", "Lit Protocol");
  });

  test("POST /auth/webauthn/verify-registration - should verify registration", async () => {
    const mockCredential = {
      id: "mockId",
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      response: {
        clientDataJSON: new Uint8Array([1, 2, 3, 4]).buffer,
        attestationObject: new Uint8Array([1, 2, 3, 4]).buffer,
      },
      type: "public-key",
    };

    const response = await app.handle(
      new Request("http://localhost/auth/webauthn/verify-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": "test-key",
          "Origin": "http://localhost:3000"
        },
        body: JSON.stringify({
          credential: mockCredential
        }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("requestId");
  });
}); 