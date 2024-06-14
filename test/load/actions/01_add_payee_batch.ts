import { RELAY_URL_HABANERO, RELAY_URL_MANZANO } from '@lit-protocol/constants';
import { registerPayer } from './00_register_payer';

const relayUrl = RELAY_URL_HABANERO;

// create a random wallet address
function generateWalletAddress() {
    const publicKey = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));

    return Buffer.from(publicKey).toString("hex");
}

async function addPayee(index: number, api_key: string, payerSecret: string, walletAddresses: string[]) {
    console.log(`Testing: Adding ${walletAddresses.length} payees...`)

    const result = await fetch(`${relayUrl}/register-payer`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": api_key,
            "payer-secret": payerSecret,
        },
        body: JSON.stringify([...walletAddresses])
    })
        .then(res => res.json())

    if (!result.success) {
        throw new Error(`Failed to register payer ${index}: ${result.error}`);
    }

    console.log(`Payer ${index} registered with payer-secret: ${result.payerSecretKey}`);

    return result;
}

async function testAddPayees() {
    const numPayee = 2500;
    const apiKey = "apple-burn-cat"

    const payer = await registerPayer(0, apiKey);

    const startTime = Date.now();
    const tx = await addPayee(0, apiKey, payer.payerSecret, Array.from({ length: numPayee }, () => generateWalletAddress()));

    if (tx.error) {
        throw new Error(`Failed to add payees: ${tx.error}`);
    }

    const endTime = Date.now();

    console.log(`Added ${numPayee} payees in ${endTime - startTime}ms`);
}

testAddPayees()
    .then((results) => console.log("Done!", results))
    .catch(console.error);