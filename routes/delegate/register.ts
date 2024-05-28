import { Request, Response } from 'express';
import * as bip39 from 'bip39';
import { HDKey } from 'ethereum-cryptography/hdkey';
import crypto from 'crypto';
import { getProvider, mintCapacityCredits, sendLitTokens } from '../../lit';
import { ethers, type Wallet } from 'ethers';

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

export async function deriveWallet(apiKey: string) {
    const mnemonic = process.env.LIT_DELEGATION_ROOT_MNEMONIC;

    if (!mnemonic) {
        throw new Error("Mnemonic not set");
    }

    const seed = await bip39.mnemonicToSeed(mnemonic);
    const hdWallet = HDKey.fromMasterSeed(seed);
    const userPath = `m/44'/60'/0'/0/${normalizeApiKey(apiKey) % 2147483647}`;
    const key = hdWallet.derive(userPath);

    if (!key.publicKey || !key.privateKey) {
        throw new Error("Failed to derive public key");
    }

    const wallet = new ethers.Wallet(key.privateKey, getProvider());

    return wallet;
}

async function fundWallet(wallet: Wallet) {
    const tx = await sendLitTokens(wallet.address, "0.001");

    if (!tx) {
        throw new Error("Failed to fund wallet");
    }

    console.log(`Funded wallet ${wallet.publicKey} with 0.001 LIT`);

    return wallet;
}

async function createCapacityCredits(wallet: Wallet) {
    const tx = await mintCapacityCredits({ signer: wallet });

    if (!tx) {
        throw new Error("Failed to mint capacity credits");
    }

    console.log(`Minted capacity credits for ${wallet.address}`);

    return wallet;
}

export function registerPayerHandler(req: Request, res: Response) {
    const apiKey = req.header("api-key");

    if (!apiKey) {
        res.status(400).send("Missing API key");
        return;
    }

    return deriveWallet(apiKey)
        .then(fundWallet)
        .then(createCapacityCredits)
        .then((wallet: Wallet) => {
            res.status(200).send(`Payer registered successfully for: ${wallet.publicKey}`);
        })
        .catch((err) => {
            console.error("Failed to register payer", err);
            res.status(500).send("Failed to register payer");
        });
}