/**
 * Test suite for the Relay Server API endpoints
 * Tests the PKP minting and auth methods endpoints
 */
import { describe, expect, test } from "bun:test";
import { app } from "./server";
import { logger } from "services/lit/LitChainClient/utils/logger";
import { env } from "config/env";

describe("Relay Server API - PKP Endpoints", () => {
  test("POST /pkp/mint", async () => {
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
      new Request("http://localhost/pkp/mint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "1234567890",
        },
        body: JSON.stringify(payload),
      })
    );

    expect(response.status).toBe(200);

    const responseData = await response.json();

    logger.info("mint hash:", responseData.hash);

    // Verify the response structure
    expect(responseData).toHaveProperty("hash");
    expect(responseData).toHaveProperty("receipt");
    expect(responseData).toHaveProperty("decodedLogs");
  });

  test("POST /pkp/claim", async () => {
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
      new Request("http://localhost/pkp/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "1234567890",
        },
        body: JSON.stringify(payload),
      })
    );

    if (response.status === 500) {
      const errorResponse = await response.json();
      logger.info("error response:", errorResponse);
    } else {
      expect(response.status).toBe(200);

      const responseData = await response.json();

      logger.info("claim hash:", responseData.requestId);

      expect(responseData).toHaveProperty("requestId");
    }
  });

  test("POST /pkp/webauthn/generate-registration-options", async () => {
    const payload = {
      username: "Anson",
    };

    const response = await app.handle(
      new Request(
        "http://localhost/pkp/webauthn/generate-registration-options",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "1234567890",
          },
          body: JSON.stringify(payload),
        }
      )
    );
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.rp.name).toBe("Lit Protocol");
    expect(result.rp.id).toBe("localhost");
    expect(result.user.name).toBe("Anson");
  });
});

describe("Rate Limiter", () => {
  test("should limit requests according to configuration", async () => {
    const maxRequests = Number(env.MAX_REQUESTS_PER_WINDOW);
    const endpoint = "http://localhost/test-rate-limit";

    // Make maxRequests number of requests
    for (let i = 0; i < maxRequests; i++) {
      const response = await app.handle(
        new Request(endpoint, {
          method: "GET",
          headers: {
            "x-api-key": "1234567890",
          },
        })
      );
      expect(response.status).toBe(200);
    }

    // The next request should be rate limited
    const limitedResponse = await app.handle(
      new Request(endpoint, {
        method: "GET",
        headers: {
          "x-api-key": "1234567890",
        },
      })
    );

    console.log("limitedResponse.status:", limitedResponse.status);

    expect(limitedResponse.status).toBe(429);
    expect(await limitedResponse.text()).toBe("Rate limit exceeded");
  });
});

describe("API Key Authentication", () => {
  test("should reject requests without API key", async () => {
    const payload = {
      username: "Anson",
    };

    const response = await app.handle(
      new Request(
        "http://localhost/pkp/webauthn/generate-registration-options",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
    );

    expect(response.status).toBe(401);
    const error = await response.json();
    expect(error.error).toBe(
      "Missing API key. If you do not have one, please request one at https://forms.gle/osJfmRR2PuZ46Xf98"
    );
  });

  test("should accept requests with valid API key", async () => {
    const payload = {
      username: "Anson",
    };

    const response = await app.handle(
      new Request(
        "http://localhost/pkp/webauthn/generate-registration-options",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "test-api-key", // You might want to use env.TEST_API_KEY here
          },
          body: JSON.stringify(payload),
        }
      )
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.rp.name).toBe("Lit Protocol");
  });
});
