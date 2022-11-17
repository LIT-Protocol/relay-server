export interface StoreConditionRequest {
    sessionSig: SessionSig,
    key: string,
    value: string,
    securityHash: string,
    chainId: number,
    permanent: boolean,
    capabilityProtocolPrefix: CapabilityProtocolPrefix,
}

export interface StoreConditionResponse {
    txHash?: string,
    error?: string,
}

export interface StoreConditionWithSigner {
    key: string,
    value: string,
    securityHash: string,
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

export interface SessionSig {
    sig: string,
    derivedVia: string,
    signedMessage: string,
    address: string,
    algo: string,
}

export interface SessionSigSignedMessage {
    sessionKey: string,
    resources: string[],
    capabilities: Array<AuthSig>,
    issuedAt: string,
    expiration: string,
}

export interface Config {
    redisUrl: string,
    port: number,
}

export enum CapabilityProtocolPrefix {
    LitEncryptionCondition = "litEncryptionCondition",
    LitSigningCondition = "litSigningCondition",
}

export interface CapabilityObject {
    def?: string[],
    tar?: { [key: string]: string },
    ext?: { [key: string]: string },
}


