
import { RELAY_URL_HABANERO, RELAY_URL_MANZANO } from '@lit-protocol/constants';
import { assertNotNull, assertStatus, assertString, getProp } from './util';

type SupportedNetworks = 'habanero' | 'manzano';

function getRelayURLByNetwork(network: SupportedNetworks): string {
    switch (network) {
        case 'habanero':
            return RELAY_URL_HABANERO;
        case 'manzano':
            return RELAY_URL_MANZANO;
    }
}

export class LitRelayClient {

    private readonly baseUrl: string;
    private readonly apiKey: string;

    private payerSecret: string | undefined = undefined;

    /**
     * Create a new LitRelayClient instance. Requires that the payer is already registered.
     * and the the payer secret is known.
     * 
     * ```typescript
     * const client = new LitRelayClient('https://habanero.lit.dev', 'my-api-key', 'my-payer-secret');
     * ```
     * 
     * @param baseUrl
     * @param apiKey
     * @param payerSecret
     */
    private constructor(baseUrl: string, apiKey: string, payerSecret: string) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;

        if (payerSecret) {
            this.payerSecret = payerSecret;
        }
    }

    /**
     * Adds a new payee to the payer's delegation list.
     * 
     * ```typescript
     * const client = await LitRelayClient.connect('habanero', 'my-api-key', 'my-payer-secret');
     * const result = await client.addPayee('payee-wallet-address');
     * ```
     * @param payeeAddress
     * 
     * @returns Promise<{ tokenId: string } | Error>
     */
    public addPayee(payeeAddress: string): Promise<{ tokenId: string }> {
        if (!this.payerSecret) {
            return Promise.reject('Payer secret key is missing');
        }

        return fetch(`${this.baseUrl}/add-users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.apiKey,
                'payer-secret-key': this.payerSecret,
            },
            body: JSON.stringify([payeeAddress]),
        })
            .then(assertStatus(200, 'Failed to add payee: request failed'))
            .then(res => res.json())
            .then(json => assertString(json.tokenId, 'Failed to add payee: missing token ID'))
            .then(tokenId => ({ tokenId }));
    }

    /**
     * Registers a new payer with the Lit Relay server using the provided API key. Returns
     * a new LitRelayClient instance with the payer secret key.
     * 
     * ```typescript
     * const client = await LitRelayClient.register('habanero', 'my-api-key');
     * ```
     * 
     * @param network 
     * @param apiKey 
     * 
     * @returns LitRelayClient
     */
    public static register(network: SupportedNetworks, apiKey: string): Promise<LitRelayClient {
        if (network !== 'habanero' && network !== 'manzano') {
            throw Promise.reject('Invalid network');
        }

        const baseUrl = getRelayURLByNetwork(network);

        return fetch(`${baseUrl}/register-payer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
        })
            .then(assertStatus(200, 'Failed to register payer: request failed'))
            .then(res => res.json())
            .then(json => getProp(json, 'payerSecretKey'))
            .then(json => assertString(json.payerSecretKey, 'Failed to register payer: missing secret key'))
            .then(payerSecretKey => new LitRelayClient(baseUrl, apiKey, payerSecretKey));
    }

    /**
     * Connects to the Relay server for the specified network using the provided API key and payer secret
     * and returns a new LitRelayClient instance.
     * 
     * ```typescript
     * const client = await LitRelayClient.connect('habanero', 'my-api-key', 'my-payer-secret');
     * ```
     * 
     * @param network 
     * @param apiKey 
     * @param payerSecret 
     * 
     * @returns LitRelayClient
     */
    public static connect(network: SupportedNetworks, apiKey: string, payerSecret: string) {
        if (network !== 'habanero' && network !== 'manzano') {
            throw new Error('Invalid network');
        }

        const baseUrl = getRelayURLByNetwork(network);

        return new LitRelayClient(baseUrl, apiKey, payerSecret);
    }
}