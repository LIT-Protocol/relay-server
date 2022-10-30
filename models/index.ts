export interface StoreConditionRequest {
    key: Uint8Array,
    value: Uint8Array,
    securityHash: Uint8Array,
    chainId: number,
    permanent: boolean,
}

export interface StoreConditionResponse {
    txHash?: string,
    error?: string,
}

export interface StoreConditionWithSigner extends StoreConditionRequest {
    creatorAddress: string,
}