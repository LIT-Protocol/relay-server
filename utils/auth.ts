import { Base64 } from "js-base64";
import { SiweMessage, SiweResponse } from "siwe";
import nacl from "tweetnacl";
import { fromString } from "uint8arrays";
import {
  AuthSig,
  CapabilityObject,
  CapabilityProtocolPrefix,
  SessionSig,
  SessionSigSignedMessage,
} from "../models";

function checkEd25519Signature(sessionSig: SessionSig): boolean {
  const sigBytes = fromString(sessionSig.sig, "base16");
  const msgBytes = fromString(sessionSig.signedMessage, "utf8");
  const pubKeyBytes = fromString(sessionSig.address, "base16");

  return nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes);
}

function tryParseJson<T>(jsonStr: string): [T | null, Error | null] {
  try {
    const parsedObject: T = JSON.parse(jsonStr);
    return [parsedObject, null];
  } catch (e) {
    const parseErr = new Error(`Unable to parse JSON: ${e}`);
    return [null, parseErr];
  }
}

function parseSIWEMessage(
  siweMessage: string
): [SiweMessage | null, Error | null] {
  try {
    return [new SiweMessage(siweMessage), null];
  } catch (err) {
    const parseErr = new Error(`Unable to parse SIWE message: ${err}`);
    console.error(parseErr);
    return [null, parseErr];
  }
}

export function getFullResourceUri(
  protocolPrefix: CapabilityProtocolPrefix,
  resourceUri: string
): string {
  return `${protocolPrefix}://${resourceUri}`;
}

export function getResourceWildcardUri(
  protocolPrefix: CapabilityProtocolPrefix
): string {
  return `${protocolPrefix}://*`;
}

export function getSiweMessageUri(sessionPubKey: string) {
  return `lit:session:${sessionPubKey}`;
}

export async function validateSessionSignature(
  sessionSig: SessionSig,
  fullResourceUri: string,
  capabilityProtocolPrefix: CapabilityProtocolPrefix
): Promise<[string, Error | null]> {
  const now = new Date();

  console.log("sessionSig: ", sessionSig);

  // Check valid algo.
  if (sessionSig.algo !== "ed25519") {
    return ["", new Error(`Unsupported algo: ${sessionSig.algo}`)];
  }

  // Check valid derivedVia.
  if (sessionSig.derivedVia !== "litSessionSignViaNacl") {
    return ["", new Error(`Unsupported derivedVia: ${sessionSig.derivedVia}`)];
  }

  // Validate ed25519 signature.
  if (!checkEd25519Signature(sessionSig)) {
    return ["", new Error(`Invalid signature: ${sessionSig.sig}`)];
  }

  // Parse session sig signed message.
  const parseRes = tryParseJson<SessionSigSignedMessage>(
    sessionSig.signedMessage
  );
  if (!!parseRes[1]) {
    return [
      "",
      new Error(`Unable to parse session sig signed message: ${parseRes[1]}`),
    ];
  }
  const sessionSigSignedMessage = parseRes[0]!;

  // Validate session key signed message contains full resource URI or the wildcard for the corresponding
  // capabilityProtocolPrefix.
  if (
    sessionSigSignedMessage.resources.indexOf(fullResourceUri) === -1 &&
    sessionSigSignedMessage.resources.indexOf(
      getResourceWildcardUri(capabilityProtocolPrefix)
    ) === -1
  ) {
    return [
      "",
      new Error(
        `Signed message resources does not contain the requested resource URI: ${fullResourceUri}`
      ),
    ];
  }

  // Validate issuedAt is in the past
  if (now.valueOf() < Date.parse(sessionSigSignedMessage.issuedAt)) {
    return ["", new Error(`Signed message contains issuedAt in the future`)];
  }

  // Validate expiresAt is in the future.
  if (now.valueOf() > Date.parse(sessionSigSignedMessage.expiration)) {
    return ["", new Error(`Signed message contains expiration in the past`)];
  }

  // Check that the resource ID is authed in the capabilities.
  try {
    const [creatorAddress, validateCapabilityErr] =
      await validateSessionCapability(
        sessionSigSignedMessage.capabilities,
        sessionSig.address,
        fullResourceUri,
        capabilityProtocolPrefix
      );
    if (!!validateCapabilityErr) {
      return [
        "",
        new Error(`Invalid capabilities array: ${validateCapabilityErr}`),
      ];
    }

    return [creatorAddress, null];
  } catch (validationErr: any) {
    return [
      "",
      new Error(`Unable to validate capabilities: ${validationErr.toString()}`),
    ];
  }
}

async function validateSessionCapability(
  capabilities: Array<AuthSig>,
  delegatedSessionPubKey: string,
  fullResourceUri: string,
  capabilityProtocolPrefix: CapabilityProtocolPrefix
): Promise<[string, Error | null]> {
  if (capabilities.length === 0) {
    return ["", new Error(`Empty capabilities array`)];
  }

  for (let i = 0; i < capabilities.length; i++) {
    const capability: AuthSig = capabilities[i];

    // Parse SIWE message.
    const parseRes = parseSIWEMessage(capability.signedMessage);
    if (!!parseRes[1]) {
      return [
        "",
        new Error(`Unable to parse session sig SIWE message: ${parseRes[1]}`),
      ];
    }
    const siweMessage = parseRes[0];

    // Validate SIWE message.
    let verifyRes: SiweResponse;
    try {
      verifyRes = await siweMessage!.verify({
        signature: capability.sig,
        time: new Date().toISOString(),
      });
      if (!verifyRes.success) {
        return [
          "",
          new Error(`Unable to verify SIWE message: ${verifyRes.error}`),
        ];
      }
    } catch (verifyErr: any) {
      return [
        "",
        new Error(`Error verifying SIWE message: ${JSON.stringify(verifyErr)}`),
      ];
    }
    const creatorAddress = verifyRes.data.address;

    // Validate resources array.
    const validateResourcesErr = validateSiweResources(
      verifyRes.data.resources!,
      capabilityProtocolPrefix,
      fullResourceUri
    );
    if (!!validateResourcesErr) {
      return [
        "",
        new Error(
          `Invalid Resources field in SIWE message: ${validateResourcesErr}`
        ),
      ];
    }

    // Validate that session pubkey is signed in the wallet-signed SIWE message.
    if (getSiweMessageUri(delegatedSessionPubKey) !== verifyRes.data.uri) {
      return ["", new Error("Invalid URI field in SIWE message")];
    }

    return [creatorAddress, null];
  }

  return ["", new Error(`Unable to find sufficient capabilities`)];
}

function validateSiweResources(
  siweResources: string[],
  capabilityProtocolPrefix: CapabilityProtocolPrefix,
  requestedHashedResourceId: string
): Error | null {
  for (let i = 0; i < siweResources.length; i++) {
    const siweResourceUri = siweResources[i];

    // Get the encoded capability object
    const encodedCapObject = siweResourceUri.split(":").pop();
    if (!encodedCapObject) {
      continue;
    }

    // Decode the capability object
    const capabilityObjectStr = Base64.decode(encodedCapObject);

    // Deserialize into JSON.
    const parseRes = tryParseJson<CapabilityObject>(capabilityObjectStr);
    if (!!parseRes[1]) {
      return new Error(`Unable to parse capability object: ${parseRes[1]}`);
    }
    const capabilityObject = parseRes[0]!;

    // First check def key.
    if (capabilityObject.def) {
      for (const defaultAction of capabilityObject.def) {
        if (
          defaultAction == capabilityProtocolPrefix.toString() ||
          defaultAction === "*"
        ) {
          return null;
        }
      }
    }

    // Then check tar key for specific targets.
    if (capabilityObject.tar) {
      const tarKeys = Object.keys(capabilityObject.tar);

      for (let j = 0; j < tarKeys.length; j++) {
        const resourceIdHash = tarKeys[j];
        const permittedActions = capabilityObject.tar[resourceIdHash];
        const isActionPermitted =
          permittedActions.indexOf(capabilityProtocolPrefix.toString()) > -1 ||
          permittedActions.indexOf("*") > -1;
        if (resourceIdHash === "*" && isActionPermitted) {
          return null;
        } else if (
          resourceIdHash === requestedHashedResourceId &&
          isActionPermitted
        ) {
          return null;
        }
      }
    }
  }

  return new Error(
    "SIWE ReCap does not delegate sufficient capabilities to specified resource."
  );
}
