import { Request, Response } from 'express';
import { deriveWallet } from './register';
import { addPaymentDelegationPayee } from '../../lit';
import { getVersionStrategy, VersionStrategy } from '../VersionStrategy';
import redisClient from '../../lib/redisClient';

export async function addPayeeHandler(req: Request, res: Response) {
    console.log("helopooo")
    let { payeeAddresses, uuid } = req.body;
    const apiKey = req.header('api-key');
    // const eventEmitter = req.app.locals.eventEmitter;
    const payerSecret = req.header('payer-secret-key');

    const versionStrategy = getVersionStrategy(req.url);
    console.log("addPaymentDelegationPayee...0");

    if (!apiKey || !payerSecret) {
        res.status(400).json({
            success: false,
            error: 'Missing or invalid API / Payer key'
        });

        return;
    }
    // payeeAddresses = JSON.parse(payeeAddresses);
    console.log("addPaymentDelegationPayee...1");
    console.log(payeeAddresses);
    console.log(!payeeAddresses);
    console.log(!Array.isArray(payeeAddresses));
    console.log(payeeAddresses.length < 1);
    if (!payeeAddresses || !Array.isArray(payeeAddresses) || payeeAddresses.length < 1) {
        res.status(400).json({
            success: false,
            error: 'Missing or invalid payee addresses!'
        });
        return;
    }

    // version strategy is required
    if (!versionStrategy) {
        throw new Error("versionStrategy is required");
    }

    // must contain the value in the VersionStrategy enum
    if (!Object.values(VersionStrategy).includes(versionStrategy)) {
        throw new Error(`Invalid version strategy. Must be one of: ${Object.values(VersionStrategy).join(", ")}`);
    }

    const wallet = await deriveWallet(apiKey, payerSecret);
    let error: string | boolean = false;

    try {
        console.log("addPaymentDelegationPayee...");
        const data = await addPaymentDelegationPayee({
            wallet,
            payeeAddresses,
            versionStrategy,
            // eventEmitter
        });
        if (data.tx) {
            const source = 'lit-relayer';
            console.info("Minted PKP", {
                requestId: data.tx,
                source,
            });
        }

        if (data.queueId) {
            const queueId = data.queueId;
            // mapping queueId => uuid for webhook 
            console.log("in delegate uuid", uuid);
            console.log("queueId in delegate uuid", queueId);
            await redisClient.hSet("userQueueIdMapping", queueId, uuid);
            return res.status(200).send({
                queueId
            });
        }

        throw new Error('Failed to add payee: delegation transaction failed');

    } catch (err) {
        console.error('Failed to add payee', err);
        error = (err as Error).toString();
    }

    if (error) {
        res.status(500).json({
            success: false,
            error
        });
    } else {
        res.status(200).json({
            success: true
        });
    }
}