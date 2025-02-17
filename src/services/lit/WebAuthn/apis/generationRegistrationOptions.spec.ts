import { describe, expect, test } from "bun:test";
import { env } from "config/env";
import { generateRegistrationOptions } from "./generationRegistrationOptions";

describe("WebAuthn", () => {
  test("generateRegistrationOptions", async () => {
    const request = {
      url: "https://example.com",
    };
    const registrationOptions = await generateRegistrationOptions(request);

    // Expected output:
    // {
    //   challenge: "SqPp7N4cfVjXXw3EVbnHelon53Bw8ke-4ZXP1ta7qzE",
    //   rp: {
    //     name: "Lit Protocol",
    //     id: "example.com",
    //   },
    //   user: {
    //     id: "0x46c77a75b0cf14f03c1da4cb8294f406266f807b117387258dd521186c91b838",
    //     name: "Usernameless user (2025-02-17 22:07:38)",
    //     displayName: "Usernameless user (2025-02-17 22:07:38)",
    //   },
    //   pubKeyCredParams: [
    //     {
    //       alg: -7,
    //       type: "public-key",
    //     }
    //   ],
    //   timeout: 6000,
    //   attestation: "direct",
    //   excludeCredentials: [],
    //   authenticatorSelection: {
    //     userVerification: "required",
    //     residentKey: "required",
    //     requireResidentKey: true,
    //   },
    //   extensions: undefined,
    // }
    expect(registrationOptions.challenge).toBeDefined();
    expect(registrationOptions.rp.name).toBe(env.WEBAUTHN_RP_NAME);
    expect(registrationOptions.rp.id).toBe(new URL(request.url).hostname);
    expect(registrationOptions.user.name).toBeDefined();
    expect(registrationOptions.user.id).toBeDefined();
    expect(registrationOptions.user.displayName).toBeDefined();
    expect(registrationOptions.pubKeyCredParams[0].alg).toBe(-7);
    expect(registrationOptions.timeout).toBe(env.WEBAUTHN_TIMEOUT);
    expect(registrationOptions.attestation).toBe("direct");
    expect(registrationOptions.excludeCredentials).toEqual([]);
    expect(registrationOptions.authenticatorSelection?.userVerification).toBe(
      "required"
    );
    expect(registrationOptions.authenticatorSelection?.residentKey).toBe(
      "required"
    );
  });

  test("generateRegistrationOptions with username", async () => {
    const request = {
      url: "https://example.com",
      username: "testuser",
    };
    const registrationOptions = await generateRegistrationOptions(request);
    expect(registrationOptions.user.name).toBe(request.username);
  });
});
