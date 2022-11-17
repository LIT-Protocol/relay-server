import { Request } from 'express';
import { Response } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { storeConditionWithSigner } from '../lit';
import { CapabilityProtocolPrefix, StoreConditionRequest, StoreConditionResponse } from '../models';
import { getFullResourceUri, validateSessionSignature } from '../utils/auth';

const BYTE_STRING_LENGTH = 64;

// TODO: Change into async post (with getter API) to handle more concurrent requests.
export async function storeConditionHandler(
    req: Request<{}, StoreConditionResponse, StoreConditionRequest, ParsedQs, Record<string, any>>,
    res: Response<StoreConditionResponse, Record<string, any>, number>,
) {
    // Validate capability protocol prefix.
    if (req.body.capabilityProtocolPrefix !== CapabilityProtocolPrefix.LitEncryptionCondition.toString() &&
        req.body.capabilityProtocolPrefix !== CapabilityProtocolPrefix.LitSigningCondition.toString()) {
            return res.status(400).json({
                error: `Only the following capability protocol prefixes are supported: ${[CapabilityProtocolPrefix.LitEncryptionCondition, CapabilityProtocolPrefix.LitSigningCondition]}`
            });
        }
        
    // Validate session signature.
    const fullResourceUri = getFullResourceUri(
        req.body.capabilityProtocolPrefix,
        req.body.key.replace("0x", "")
    );
    const [creatorAddress, validationErr] = await validateSessionSignature(
        req.body.sessionSig,
        fullResourceUri,
        req.body.capabilityProtocolPrefix,
    );
    if (!!validationErr) {
        console.error("Invalid sessionSig", { error: validationErr });
        return res.status(401).json({
            error: "Invalid sessionSig"
        });
    }
    console.info("Verified creator", { creatorAddress });

    // Validate request body
    let validationError = validateRequest(req.body);
    if (!!validationError) {
        return res.status(400).json({
            error: validationError.toString()
        });
    }

    // Call into AccessControlConditions.storeConditionWithSigner()
    try {
        const {
            key,
            value,
            securityHash,
            chainId,
            permanent,
        } = req.body;

        const storeTx = await storeConditionWithSigner({
            key,
            value,
            securityHash,
            chainId,
            permanent,
            creatorAddress,
        });

        return res.status(201).json({
            txHash: storeTx.hash
        });
    } catch (err) {
        console.error("Unable to store condition with signer", { err });
        return res.status(500).end();
    }
}

function validateRequest(requestBody: StoreConditionRequest): Error | null {
    const keysToCheckExist: Array<keyof StoreConditionRequest> = ["key", "value", "securityHash", "chainId", "permanent"];
    const keysToCheckByteStringLength: Array<keyof Pick<StoreConditionRequest, "key" | "value" | "securityHash">> = ["key", "value", "securityHash"];

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

function validateChainId(chainId: number): boolean {
    // TODO: something more sophisticated?
    return true;
}