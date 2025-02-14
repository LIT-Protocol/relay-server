/**
 * WebAuthn Routes
 * Handles WebAuthn registration and authentication
 */

import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts
} from "@simplewebauthn/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { env } from "../config/env";
import { utils } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { Request, Response, Router } from "express";
import { mintPKP } from "../services/lit";
import {
  AuthMethodType,
  AuthMethodVerifyRegistrationResponse,
  WebAuthnVerifyRegistrationRequest
} from "../types";
import { getDomainFromUrl } from "../utils/string";
import { Elysia, t } from "elysia";
import { base64url } from "@simplewebauthn/server/helpers";
import { 
  generateRegistrationOptions as generateWebAuthnRegistrationOptions,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type { 
  RegistrationResponseJSON,
  AuthenticatorDevice,
  AuthenticationExtensionsClientOutputs,
  AuthenticatorTransportFuture,
  RegistrationCredential
} from "@simplewebauthn/typescript-types";
import { decodeCborFirst } from "../utils/cbor";
import { decodeECKeyAndGetPublicKey } from "../utils/webAuthn/keys";
import { convertCOSEtoPKCS } from "../utils/webAuthn/convertCOSEtoPKCS";
import { verifySignature } from "../utils/webAuthn/verifySignature";

export const webAuthnRouter = Router();

// Constants for WebAuthn configuration
const RP_NAME = "Lit Protocol";
const RP_ID = env.RP_ID;
const ORIGIN = env.EXPECTED_ORIGINS[0];

// Helper function to convert base64url to ArrayBuffer
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const base64String = base64 + padding;
  const str = atob(base64String);
  const buffer = new ArrayBuffer(str.length);
  const byteView = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    byteView[i] = str.charCodeAt(i);
  }
  return buffer;
}

// Helper function to convert ArrayBuffer to base64url string
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export const webauthnRoutes = new Elysia({ prefix: "/auth/webauthn" })
  .get("/generate-registration-options", async ({ set }) => {
    try {
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: "test-user",
        userName: "test@example.com",
        attestationType: "none",
        authenticatorSelection: {
          userVerification: "required",
          residentKey: "required",
        },
      });

      set.status = 200;
      return options;
    } catch (error) {
      set.status = 500;
      return { error: "Failed to generate registration options" };
    }
  })
  .post("/verify-registration", 
    async ({ body, set }) => {
      try {
        // Convert the credential to the expected format
        const credential = {
          id: body.credential.id,
          rawId: body.credential.rawId,
          response: {
            clientDataJSON: body.credential.response.clientDataJSON,
            attestationObject: body.credential.response.attestationObject,
          },
          type: "public-key" as const,
          clientExtensionResults: body.credential.clientExtensionResults || {},
          transports: body.credential.transports?.map(t => t as AuthenticatorTransportFuture),
        } satisfies RegistrationResponseJSON;

        const verification = await verifyRegistrationResponse({
          credential,
          expectedChallenge: body.expectedChallenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
          requireUserVerification: true,
        });

        if (verification.verified && verification.registrationInfo) {
          const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
          
          // Generate auth method ID from credential raw ID
          const authMethodId = keccak256(toUtf8Bytes(`${body.credential.rawId}:lit`));

          // Convert credential public key to hex
          const credentialPublicKeyHex = utils.hexlify(credentialPublicKey);

          // Mint PKP with the credential
          const mintTx = await mintPKP({
            authMethodType: AuthMethodType.WebAuthn,
            authMethodId,
            authMethodPubkey: credentialPublicKeyHex,
          });

          set.status = 200;
          return { 
            requestId: mintTx.hash,
            verified: true,
          };
        } else {
          set.status = 400;
          return { error: "Verification failed" };
        }
      } catch (error) {
        console.error("WebAuthn verification error:", error);
        set.status = 500;
        return { error: "Failed to verify registration" };
      }
    },
    {
      body: t.Object({
        credential: t.Object({
          id: t.String(),
          rawId: t.String(),
          response: t.Object({
            clientDataJSON: t.String(),
            attestationObject: t.String(),
          }),
          type: t.String(),
          clientExtensionResults: t.Optional(t.Object({})),
          transports: t.Optional(t.Array(t.String())),
        }),
        expectedChallenge: t.String(),
      })
    }
  );

// Generate WebAuthn registration options
webAuthnRouter.get("/generate-registration-options", async (req, res) => {
  // Get username from query string
  const username = req.query.username as string | undefined;

  // Get RP_ID from request Origin
  const rpID = getDomainFromUrl(req.get("Origin") || env.RP_ID);

  const authenticatorUsername = generateUsernameForOptions(username);
  const opts: GenerateRegistrationOptionsOpts = {
    rpName: "Lit Protocol",
    rpID,
    userID: keccak256(toUtf8Bytes(authenticatorUsername)).slice(2),
    userName: authenticatorUsername,
    timeout: 60000,
    attestationType: "direct",
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "required",
    },
    supportedAlgorithmIDs: [-7], // ES256
  };

  const options = generateRegistrationOptions(opts);
  return res.json(options);
});

// Verify WebAuthn registration
webAuthnRouter.post(
  "/verify-registration",
  async (
    req: Request<
      {},
      AuthMethodVerifyRegistrationResponse,
      WebAuthnVerifyRegistrationRequest
    >,
    res: Response<AuthMethodVerifyRegistrationResponse>
  ) => {
    // Get RP_ID from request Origin
    const requestOrigin = req.get("Origin") || env.RP_ID;
    const rpID = getDomainFromUrl(requestOrigin);

    // Generate auth method ID from credential raw ID
    // const rawIdString = Buffer.from(req.body.credential.rawId).toString('base64url');
    // const authMethodId = generateAuthMethodId(rawIdString);
    console.log("req.body.credential.rawId:", req.body.credential.rawId);

    // FIXME
    const authMethodId = generateAuthMethodId(req.body.credential.rawId);

    // WebAuthn verification
    let verification;
    try {
      const opts: VerifyRegistrationResponseOpts = {

        // FIXME
        credential: req.body.credential,
        // credential: {
        //   id: req.body.credential.id,
        //   rawId: Buffer.from(req.body.credential.rawId).toString('base64url'),
        //   response: {
        //     clientDataJSON: Buffer.from(req.body.credential.response.clientDataJSON).toString('base64url'),
        //     attestationObject: Buffer.from(req.body.credential.response.attestationObject).toString('base64url'),
        //   },
        //   type: req.body.credential.type,
        //   clientExtensionResults: {},
        // },
        expectedChallenge: () => true, // we don't work with challenges in registration
        expectedOrigin: [requestOrigin],
        expectedRPID: rpID,
        requireUserVerification: true,
      };
      verification = await verifyRegistrationResponse(opts);
    } catch (error) {
      const _error = error as Error;
      console.error(_error);
      return res.status(400).send({ error: _error.message });
    }

    const { verified, registrationInfo } = verification;

    // Mint PKP for user
    if (!verified || !registrationInfo) {
      console.error("Unable to verify registration", { verification });
      return res.status(400).json({
        error: "Unable to verify registration",
      });
    }

    const { credentialPublicKey } = registrationInfo;

    try {
      const cborEncodedCredentialPublicKey = utils.hexlify(
        utils.arrayify(credentialPublicKey)
      );

      const mintTx = await mintPKP({
        authMethodType: AuthMethodType.WebAuthn,
        authMethodId,
        authMethodPubkey: cborEncodedCredentialPublicKey,
      });

      return res.status(200).json({
        requestId: mintTx.hash,
      });
    } catch (error) {
      const _error = error as Error;
      console.error("[WebAuthn] Unable to mint PKP for user", { _error });
      return res.status(500).json({
        error: "[WebAuthn] Unable to mint PKP for user",
      });
    }
  }
);

// Helper functions
function generateAuthMethodId(credentialRawId: string): string {
  return utils.keccak256(toUtf8Bytes(`${credentialRawId}:lit`));
}

function generateDefaultUsername(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return `Usernameless user (${year}-${month}-${day} ${hours}:${minutes}:${seconds})`;
}

function generateUsernameForOptions(username?: string): string {
  return username || generateDefaultUsername();
}
