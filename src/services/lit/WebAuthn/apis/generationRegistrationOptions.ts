import * as SimpleWebAuthnServer from "@simplewebauthn/server";
import { env } from "config/env";
import { keccak256, toBytes } from "viem";
import {
  WebAuthnRequestInput,
  WebAuthnRequestSchema,
} from "../schemas/WebAuthnRequest";
import { generateTimestampBasedUsername } from "../utils/generateUsername";

export const generateRegistrationOptions = async (
  request: WebAuthnRequestInput
) => {
  const validatedRequest = WebAuthnRequestSchema.parse(request);

  // Relying Party Identifier - is usually the domain (or a registered domain suffix) of your website (e.g., "example.com"). The browser uses it to ensure that credentials are tied to your domain and not misused on another site.
  const RP_ID = new URL(validatedRequest.url).hostname;

  const userName = validatedRequest.username
    ? validatedRequest.username
    : generateTimestampBasedUsername();

  const userID = keccak256(toBytes(userName));

  // https://www.iana.org/assignments/cose/cose.xhtml
  // COSE Algorithm Identifier for ES256
  const ES256 = -7;

  const options: SimpleWebAuthnServer.GenerateRegistrationOptionsOpts = {
    rpID: RP_ID,
    rpName: env.WEBAUTHN_RP_NAME,
    userID: userID,
    userName: userName,
    timeout: env.WEBAUTHN_TIMEOUT,
    attestationType: "direct", // TODO: change to none (Anson: why?),
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "required",
    },
    supportedAlgorithmIDs: [ES256],
  };

  return SimpleWebAuthnServer.generateRegistrationOptions(options);
};
