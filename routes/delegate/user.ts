import { Request, Response } from 'express';
import { deriveWallet } from './register';
import { addPaymentDelegationPayee, queryCapacityCredits } from '../../lit';

export async function addPayeeHandler(req: Request, res: Response) {
    const payeeAddresses = req.body.payeeAddresses;
    const apiKey = req.header('api-key');

    if (!apiKey) {
        res.status(400).send('Missing API key');
        return;
    }

    if (!payeeAddresses || !Array.isArray(payeeAddresses) || payeeAddresses.length < 1) {
        res.status(400).send('Missing payee addresses');
        return;
    }

    const wallet = await deriveWallet(apiKey);
    const tx = await addPaymentDelegationPayee({
        wallet,
        payeeAddresses
    });

    if (!tx) {
        res.status(500).send('Failed to add payee');
        return;
    }

    res.status(200).send('Payee added successfully');
}