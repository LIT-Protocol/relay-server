import { RELAY_URL_HABANERO, RELAY_URL_MANZANO } from '@lit-protocol/constants';

const vocab = [
    "apple", "burn", "cat", "dog", "elephant", "fancy", "giraffe", "happy", "ice", "jelly", "kite", "lemon", "mango", "nasty", "orange", "penguin", "quilt", "rabbit", "silly", "tiger", "umbrella", "violet", "wonderful", "x-ray", "yellow", "zebra"
]

const relayUrl = RELAY_URL_HABANERO;

// create a random api-key (three words, separated by hyphens, all lowercase)
function generateApiKey() {
    return [0, 1, 2].map(() => vocab[Math.floor(Math.random() * vocab.length)]).join("-");
}

export async function registerPayer(index: number, api_key: string) {
    console.log(`Registering payer ${index} with api-key: ${api_key}...`);

    const result = await fetch(`${relayUrl}/register-payer`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": api_key
        }
    })
        .then(res => res.json())

    if (!result.success) {
        throw new Error(`Failed to register payer ${index}: ${result.error}`);
    }

    console.log(`Payer ${index} registered with payer-secret: ${result.payerSecretKey}`);

    return {
        apiKey: api_key,
        payerSecret: result.payerSecretKey
    };
}

async function testRegisterPayer() {
    const batchSize = 10;
    const keys = Array.from({ length: batchSize }, () => generateApiKey());

    return Promise.allSettled(keys.map((key, index) => registerPayer(index, key)));
}

// testRegisterPayer()
//     .then((results) => console.log("Done!", results))
//     .catch(console.error);