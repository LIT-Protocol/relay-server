"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeConditionHandler = void 0;
const lit_1 = require("../lit");
const models_1 = require("../models");
const auth_1 = require("../utils/auth");
const BYTE_STRING_LENGTH = 64;
// TODO: Change into async post (with getter API) to handle more concurrent requests.
async function storeConditionHandler(req, res) {
    // Validate capability protocol prefix.
    if (req.body.capabilityProtocolPrefix !==
        models_1.CapabilityProtocolPrefix.LitEncryptionCondition.toString() &&
        req.body.capabilityProtocolPrefix !==
            models_1.CapabilityProtocolPrefix.LitSigningCondition.toString()) {
        return res.status(400).json({
            error: `Only the following capability protocol prefixes are supported: ${[
                models_1.CapabilityProtocolPrefix.LitEncryptionCondition,
                models_1.CapabilityProtocolPrefix.LitSigningCondition,
            ]}`,
        });
    }
    // Validate session signature.
    const fullResourceUri = (0, auth_1.getFullResourceUri)(req.body.capabilityProtocolPrefix, req.body.key.replace("0x", ""));
    const [creatorAddress, validationErr] = await (0, auth_1.validateSessionSignature)(req.body.sessionSig, fullResourceUri, req.body.capabilityProtocolPrefix);
    if (!!validationErr) {
        console.error("Invalid sessionSig", { error: validationErr });
        return res.status(401).json({
            error: "Invalid sessionSig",
        });
    }
    console.info("Verified creator", { creatorAddress });
    // Validate request body
    let validationError = validateRequest(req.body);
    if (!!validationError) {
        return res.status(400).json({
            error: validationError.toString(),
        });
    }
    // Call into AccessControlConditions.storeConditionWithSigner()
    try {
        const { key, value, securityHash, chainId, permanent } = req.body;
        const storeTx = await (0, lit_1.storeConditionWithSigner)({
            key,
            value,
            securityHash,
            chainId,
            permanent,
            creatorAddress,
        });
        return res.status(201).json({
            txHash: storeTx.hash,
        });
    }
    catch (err) {
        console.error("Unable to store condition with signer", { err });
        return res.status(500).end();
    }
}
exports.storeConditionHandler = storeConditionHandler;
function validateRequest(requestBody) {
    const keysToCheckExist = [
        "key",
        "value",
        "securityHash",
        "chainId",
        "permanent",
    ];
    const keysToCheckByteStringLength = ["key", "value", "securityHash"];
    // Check values exist
    const requestBodyKeys = Object.keys(requestBody);
    for (const k of keysToCheckExist) {
        if (requestBodyKeys.indexOf(k) === -1) {
            return new Error(`${k} not provided`);
        }
    }
    // Check 32 bytes long
    for (const k of keysToCheckByteStringLength) {
        if (requestBody[k].length != BYTE_STRING_LENGTH) {
            return new Error(`${k} is not ${BYTE_STRING_LENGTH} long`);
        }
    }
    // Check chainId is valid.
    if (!validateChainId(requestBody.chainId)) {
        return new Error("chainId invalid");
    }
    return null;
}
function validateChainId(chainId) {
    // TODO: something more sophisticated?
    return true;
}
//# sourceMappingURL=storeCondition.js.map