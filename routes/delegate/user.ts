import { Request, Response } from 'express';
import { deriveWallet } from './register';
import { addPaymentDelegationPayee } from '../../lit';

export async function addPayeeHandler(req: Request, res: Response) {
    const payeeAddresses = req.body as string[];
    const apiKey = req.header('api-key');
    const apiSecret = req.header('payer-secret-key');

    if (!apiKey || !apiSecret) {
        res.status(400).send('Missing or invalid API / Payer key');
        return;
    }

    if (!payeeAddresses || !Array.isArray(payeeAddresses) || payeeAddresses.length < 1) {
        res.status(400).send('Missing payee addresses');
        return;
    }

    const wallet = await deriveWallet(apiKey, apiSecret);

    try {
        const tx = await addPaymentDelegationPayee({
            wallet,
            payeeAddresses
        });

        if (!tx) {
            throw new Error('Failed to add payee: delegation transaction failed');
        }
    } catch (err) {
        res.status(500).send({
            success: false,
            error: 'Failed to add payee: delegation transaction failed'
        });
    }

    res.status(200).send({
        success: true,
    });
}