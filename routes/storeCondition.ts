import { utils } from 'ethers';
import { Request } from 'express';
import { Response } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { storeConditionWithSigner } from '../lit';
import { StoreConditionRequest, StoreConditionResponse } from '../models';

const BYTE_ARRAY_LENGTH = 32;

// TODO: Change into async post (with getter API) to handle more concurrent requests.
export async function storeConditionHandler(
    req: Request<{}, StoreConditionResponse, StoreConditionRequest, ParsedQs, Record<string, any>>,
    res: Response<StoreConditionResponse, Record<string, any>, number>,
) {
    // Verify auth sig
    const { signedMessage, sig, address } = req.body.authSig;
    const creatorAddress = utils.verifyMessage(signedMessage, sig);
    if (creatorAddress != address) {
        return res.status(401).json({
            error: "Invalid authSig"
        });
    }
    console.info("Verified creator", { creatorAddress });

    // TODO: Rate limit check

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
    const keysToCheckByteArrayLength: Array<keyof Pick<StoreConditionRequest, "key" | "value" | "securityHash">> = ["key", "value", "securityHash"];

    // Check values exist
    const requestBodyKeys = Object.keys(requestBody);
    for (const k of keysToCheckExist) {
        if (requestBodyKeys.indexOf(k) === -1) {
            return new Error(`${k} not provided`);
        }
    }

    // Check 32 bytes long
    for (const k of keysToCheckByteArrayLength) {
        if (requestBody[k].length != BYTE_ARRAY_LENGTH) {
            return new Error(`${k} is not 32 long`);
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