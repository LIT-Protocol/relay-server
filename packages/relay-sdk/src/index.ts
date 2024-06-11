
import { RELAY_URL_HABANERO, RELAY_URL_MANZANO } from '@lit-protocol/constants';

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
     * @returns Promise<{
     *  success: false;
     *  error: string;
     * } | {
     *  success: true;
     *  tokenId: string;
     * }>
     */
    public async addPayee(payeeAddress: string) {
        if (!this.payerSecret) {
            throw new Error('Payer secret not set');
        }

        const res = await fetch(`${this.baseUrl}/add-users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.apiKey,
                'payer-secret-key': this.payerSecret,
            },
            body: JSON.stringify([payeeAddress]),
        });

        if (res.status !== 200) {
            return {
                success: false,
                error: 'Failed to add payee: request failed',
            };
        }

        const data = await res.json();

        return {
            success: true,
            tokenId: data.tokenId,
        };
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
    public static async register(network: SupportedNetworks, apiKey: string) {
        if (network !== 'habanero' && network !== 'manzano') {
            throw new Error('Invalid network');
        }

        const baseUrl = getRelayURLByNetwork(network);
        const res = await fetch(`${baseUrl}/register-payer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
        });

        if (res.status !== 200) {
            throw new Error('Failed to register payer: request failed');
        }

        const data = await res.json();

        if (!data.payerSecretKey) {
            throw new Error('Failed to register payer: missing secret key');
        }

        return new LitRelayClient(baseUrl, apiKey, data.payerSecretKey);
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
    public static async connect(network: SupportedNetworks, apiKey: string, payerSecret: string) {
        if (network !== 'habanero' && network !== 'manzano') {
            throw new Error('Invalid network');
        }

        const baseUrl = getRelayURLByNetwork(network);

        return new LitRelayClient(baseUrl, apiKey, payerSecret);
    }
}