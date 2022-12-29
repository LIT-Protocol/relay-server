"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSessionSignature = exports.getSiweMessageUri = exports.getResourceWildcardUri = exports.getFullResourceUri = void 0;
const js_base64_1 = require("js-base64");
const siwe_1 = require("siwe");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const uint8arrays_1 = require("uint8arrays");
function checkEd25519Signature(sessionSig) {
    const sigBytes = (0, uint8arrays_1.fromString)(sessionSig.sig, "base16");
    const msgBytes = (0, uint8arrays_1.fromString)(sessionSig.signedMessage, "utf8");
    const pubKeyBytes = (0, uint8arrays_1.fromString)(sessionSig.address, "base16");
    return tweetnacl_1.default.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes);
}
function tryParseJson(jsonStr) {
    try {
        const parsedObject = JSON.parse(jsonStr);
        return [parsedObject, null];
    }
    catch (e) {
        const parseErr = new Error(`Unable to parse JSON: ${e}`);
        return [null, parseErr];
    }
}
function parseSIWEMessage(siweMessage) {
    try {
        return [new siwe_1.SiweMessage(siweMessage), null];
    }
    catch (err) {
        const parseErr = new Error(`Unable to parse SIWE message: ${err}`);
        console.error(parseErr);
        return [null, parseErr];
    }
}
function getFullResourceUri(protocolPrefix, resourceUri) {
    return `${protocolPrefix}://${resourceUri}`;
}
exports.getFullResourceUri = getFullResourceUri;
function getResourceWildcardUri(protocolPrefix) {
    return `${protocolPrefix}://*`;
}
exports.getResourceWildcardUri = getResourceWildcardUri;
function getSiweMessageUri(sessionPubKey) {
    return `lit:session:${sessionPubKey}`;
}
exports.getSiweMessageUri = getSiweMessageUri;
async function validateSessionSignature(sessionSig, fullResourceUri, capabilityProtocolPrefix) {
    const now = new Date();
    // Check valid algo.
    if (sessionSig.algo !== "ed25519") {
        return ["", new Error(`Unsupported algo: ${sessionSig.algo}`)];
    }
    // Check valid derivedVia.
    if (sessionSig.derivedVia !== "litSessionSignViaNacl") {
        return [
            "",
            new Error(`Unsupported derivedVia: ${sessionSig.derivedVia}`),
        ];
    }
    // Validate ed25519 signature.
    if (!checkEd25519Signature(sessionSig)) {
        return ["", new Error(`Invalid signature: ${sessionSig.sig}`)];
    }
    // Parse session sig signed message.
    const parseRes = tryParseJson(sessionSig.signedMessage);
    if (!!parseRes[1]) {
        return [
            "",
            new Error(`Unable to parse session sig signed message: ${parseRes[1]}`),
        ];
    }
    const sessionSigSignedMessage = parseRes[0];
    // Validate session key signed message contains full resource URI or the wildcard for the corresponding
    // capabilityProtocolPrefix.
    if (sessionSigSignedMessage.resources.indexOf(fullResourceUri) === -1 &&
        sessionSigSignedMessage.resources.indexOf(getResourceWildcardUri(capabilityProtocolPrefix)) === -1) {
        return [
            "",
            new Error(`Signed message resources does not contain the requested resource URI: ${fullResourceUri}`),
        ];
    }
    // Validate issuedAt is in the past
    if (now.valueOf() < Date.parse(sessionSigSignedMessage.issuedAt)) {
        return [
            "",
            new Error(`Signed message contains issuedAt in the future`),
        ];
    }
    // Validate expiresAt is in the future.
    if (now.valueOf() > Date.parse(sessionSigSignedMessage.expiration)) {
        return [
            "",
            new Error(`Signed message contains expiration in the past`),
        ];
    }
    // Check that the resource ID is authed in the capabilities.
    try {
        const [creatorAddress, validateCapabilityErr] = await validateSessionCapability(sessionSigSignedMessage.capabilities, sessionSig.address, fullResourceUri, capabilityProtocolPrefix);
        if (!!validateCapabilityErr) {
            return [
                "",
                new Error(`Invalid capabilities array: ${validateCapabilityErr}`),
            ];
        }
        return [creatorAddress, null];
    }
    catch (validationErr) {
        return [
            "",
            new Error(`Unable to validate capabilities: ${validationErr.toString()}`),
        ];
    }
}
exports.validateSessionSignature = validateSessionSignature;
async function validateSessionCapability(capabilities, delegatedSessionPubKey, fullResourceUri, capabilityProtocolPrefix) {
    if (capabilities.length === 0) {
        return ["", new Error(`Empty capabilities array`)];
    }
    for (let i = 0; i < capabilities.length; i++) {
        const capability = capabilities[i];
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
        let verifyRes;
        try {
            verifyRes = await siweMessage.verify({
                signature: capability.sig,
                time: new Date().toISOString(),
            });
            if (!verifyRes.success) {
                return [
                    "",
                    new Error(`Unable to verify SIWE message: ${verifyRes.error}`),
                ];
            }
        }
        catch (verifyErr) {
            return [
                "",
                new Error(`Error verifying SIWE message: ${JSON.stringify(verifyErr)}`),
            ];
        }
        const creatorAddress = verifyRes.data.address;
        // Validate resources array.
        const validateResourcesErr = validateSiweResources(verifyRes.data.resources, capabilityProtocolPrefix, fullResourceUri);
        if (!!validateResourcesErr) {
            return [
                "",
                new Error(`Invalid Resources field in SIWE message: ${validateResourcesErr}`),
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
function validateSiweResources(siweResources, capabilityProtocolPrefix, requestedHashedResourceId) {
    for (let i = 0; i < siweResources.length; i++) {
        const siweResourceUri = siweResources[i];
        // Get the encoded capability object
        const encodedCapObject = siweResourceUri.split(":").pop();
        if (!encodedCapObject) {
            continue;
        }
        // Decode the capability object
        const capabilityObjectStr = js_base64_1.Base64.decode(encodedCapObject);
        // Deserialize into JSON.
        const parseRes = tryParseJson(capabilityObjectStr);
        if (!!parseRes[1]) {
            return new Error(`Unable to parse capability object: ${parseRes[1]}`);
        }
        const capabilityObject = parseRes[0];
        // First check def key.
        if (capabilityObject.def) {
            for (const defaultAction of capabilityObject.def) {
                if (defaultAction == capabilityProtocolPrefix.toString() ||
                    defaultAction === "*") {
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
                const isActionPermitted = permittedActions.indexOf(capabilityProtocolPrefix.toString()) > -1 || permittedActions.indexOf("*") > -1;
                if (resourceIdHash === "*" && isActionPermitted) {
                    return null;
                }
                else if (resourceIdHash === requestedHashedResourceId &&
                    isActionPermitted) {
                    return null;
                }
            }
        }
    }
    return new Error("SIWE ReCap does not delegate sufficient capabilities to specified resource.");
}
//# sourceMappingURL=auth.js.map