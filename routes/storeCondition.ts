import { Request } from 'express';
import { Response } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { storeConditionWithSigner } from '../lit';
import { StoreConditionRequest, StoreConditionResponse } from '../models';

const BYTE_ARRAY_LENGTH = 32;

// TODO: Change into async post (with getter API) to handle more concurrent requests.
export async function storeConditionHandler(
    req: Request<{}, any, any, ParsedQs, Record<string, any>>,
    res: Response<StoreConditionResponse, Record<string, any>, number>,
) {
    const reqBody: StoreConditionRequest = req.body

    // TODO: Auth - verify PKP / wallet ownership
    const creatorAddress = "0x4259E44670053491E7b4FE4A120C70be1eAD646b" // TODO: temporary

    // TODO: Rate limit check

    // Validate request body
    let validationError = validateRequest(reqBody);
    if (!!validationError) {
        return res.status(400).json({
            error: validationError.toString()
        });
    }

    // Call into AccessControlConditions.storeConditionWithSigner()
    try {
        const storeTx = await storeConditionWithSigner({
            ...reqBody,
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