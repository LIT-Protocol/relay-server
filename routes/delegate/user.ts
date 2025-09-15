import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { deriveWallet } from './register';
import { addPaymentDelegationPayee } from '../../lit';

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
        
        // Report to Sentry for 500 errors
        Sentry.captureException(err, {
            extra: {
                apiKey,
                payeeAddresses: payeeAddresses.length,
                walletAddress: wallet.address,
            },
            tags: {
                component: 'addPayeeHandler',
                failure_type: 'transaction_failed'
            }
        });
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