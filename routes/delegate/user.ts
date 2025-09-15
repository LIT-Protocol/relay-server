import { Request, Response } from 'express';
import { deriveWallet } from './register';
import { addPaymentDelegationPayee } from '../../lit';
import mutexManager from '../../lib/mutex';

export async function addPayeeHandler(req: Request, res: Response) {
    const payeeAddresses = req.body as string[];
    const apiKey = req.header('api-key');
    const payerSecret = req.header('payer-secret-key');

    if (!apiKey || !payerSecret) {
        res.status(400).json({
            success: false,
            error: 'Missing or invalid API / Payer key'
        });

        return;
    }

    if (!payeeAddresses || !Array.isArray(payeeAddresses) || payeeAddresses.length < 1) {
        res.status(400).json({
            success: false,
            error: 'Missing or invalid payee addresses'
        });
        return;
    }

    const wallet = await deriveWallet(apiKey, payerSecret);
    let error: string | boolean = false;
    let tx: any = null;

    // Use mutex to serialize transactions for the same wallet
    const mutex = mutexManager.getMutex(wallet.address);
    const release = await mutex.acquire();

    try {
        tx = await addPaymentDelegationPayee({
            wallet,
            payeeAddresses
        });

        if (!tx) {
            throw new Error('Failed to add payee: delegation transaction failed');
        }
    } catch (err) {
        console.error('Failed to add payee', err);
        error = (err as Error).toString();
    } finally {
        release();
    }

    if (error) {
        res.status(500).json({
            success: false,
            error
        });
    } else {
        res.status(200).json({
            success: true,
            txHash: tx?.hash,
            message: 'Transaction submitted successfully. Confirmation will happen in the background.'
        });
    }
}