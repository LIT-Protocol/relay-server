import crypto from 'crypto';

import { Request, Response } from 'express';
import { ethers, utils, type Wallet } from 'ethers';
import { getProvider, mintCapacityCredits, sendLitTokens } from '../../lit';

// Takes an arbitrary string, and converts it deterministically to a number
//
// FIXME: This is a naive implementation, and could result in collisions
//        in the future. We should consider using a formalized api-key
//        that contains a unique identifier for the user.
export function normalizeApiKey(apiKey: string): number {
    const hash = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');

    return parseInt(hash, 16);
}

export function generatePayerSecret(): string {
    return crypto.randomBytes(64).toString('base64');
}

export async function deriveWallet(apiKey: string, payerSecret: string) {
    const mnemonic = process.env.LIT_DELEGATION_ROOT_MNEMONIC;

    if (!mnemonic) {
        throw new Error("Mnemonic not set");
    }

    const hdWallet = utils.HDNode.fromMnemonic(mnemonic);
    const userPath = `m/44'/60'/0'/0/${normalizeApiKey(apiKey + payerSecret) % 2147483647}`;

    const key = hdWallet.derivePath(userPath);

    if (!key.publicKey || !key.privateKey) {
        throw new Error("Failed to derive public key");
    }

    return new ethers.Wallet(key.privateKey, getProvider());
}

async function fundWallet(wallet: Wallet) {
    console.log(`Funding wallet ${wallet.address} with 0.001 LIT`);

    const tx = await sendLitTokens(wallet.address, "0.001");

    if (!tx) {
        throw new Error("Failed to fund wallet");
    }

    console.log(`Funded wallet ${wallet.address} with 0.001 LIT`);

    return wallet;
}

async function createCapacityCredits(wallet: Wallet) {
    const tx = await mintCapacityCredits({ signer: wallet });

    if (!tx) {
        throw new Error("Failed to mint capacity credits");
    }

    console.log(`Minted capacity credits for ${wallet.address}`);
    console.log('NFT id is', tx.capacityTokenId);

    return wallet;
}

export async function registerPayerHandler(req: Request, res: Response) {
    const apiKey = req.header("api-key");
    const secret = generatePayerSecret();

    if (!apiKey) {
        res.status(400).send("Missing API key");
        return;
    }

    const wallet = await deriveWallet(apiKey, secret)

    console.log(`secret: ${secret}`);

    return fundWallet(wallet)
        .then(createCapacityCredits)
        .then((wallet: Wallet) => {
            res.status(200).send({
                payerWalletAddress: wallet.address,
                payerSecretKey: secret
            });
        })
        .catch((err) => {
            console.error("Failed to register payer", err);
            res.status(500).send("Failed to register payer");
        });
}