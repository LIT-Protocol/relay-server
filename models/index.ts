export interface StoreConditionRequest {
    authSig: AuthSig,
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

export interface StoreConditionWithSigner {
    key: Uint8Array,
    value: Uint8Array,
    securityHash: Uint8Array,
    chainId: number,
    permanent: boolean,
    creatorAddress: string,
}

export interface AuthSig {
    sig: string,
    derivedVia: string,
    signedMessage: string,
    address: string,
}

export interface Config {
    redisUrl: string,
    port: number,
}