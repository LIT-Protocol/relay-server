/**
 * WebAuthn signature verification utilities
 */

import crypto from "crypto";
import cbor from "cbor";
import { verify as ed25519Verify } from "@noble/ed25519";
import { COSEKEYS, COSEKTY } from "./convertCOSEtoPKCS";
import { convertPublicKeyToPEM } from "./convertPublicKeyToPEM";

type VerifySignatureOptsCredentialPublicKey = {
  signature: Buffer;
  signatureBase: Buffer;
  credentialPublicKey: Buffer;
  hashAlgorithm?: string;
};

/**
 * Verify an authenticator's signature
 */
export async function verifySignature(
  opts: VerifySignatureOptsCredentialPublicKey,
): Promise<boolean> {
  const { signature, signatureBase, credentialPublicKey, hashAlgorithm = "sha256" } = opts;

  // Decode CBOR to COSE
  let struct;
  try {
    struct = cbor.decodeAllSync(credentialPublicKey)[0];
  } catch (err) {
    const _err = err as Error;
    throw new Error(
      `Error decoding public key while converting to PEM: ${_err.message}`,
    );
  }

  const kty = struct.get(COSEKEYS.kty);

  if (!kty) {
    throw new Error("Public key was missing kty");
  }

  // Check key type
  if (kty === COSEKTY.OKP) {
    // Verify Ed25519 slightly differently
    const x = struct.get(COSEKEYS.x);

    if (!x) {
      throw new Error("Public key was missing x (OKP)");
    }

    return ed25519Verify(signature, signatureBase, x);
  } else {
    // Convert pubKey to PEM for ECC and RSA
    const publicKeyPEM = convertPublicKeyToPEM(credentialPublicKey);

    return crypto
      .createVerify(hashAlgorithm)
      .update(signatureBase)
      .verify(publicKeyPEM, signature);
  }
} 