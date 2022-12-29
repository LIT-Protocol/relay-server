export interface GoogleOAuthRequest {
    idToken: string;
}
export interface DiscordOAuthRequest {
    accessToken: string;
}
export interface AuthMethodVerifyToMintResponse {
    requestId?: string;
    error?: string;
}
export interface AuthMethodVerifyToFetchResponse {
    pkps?: PKP[];
    error?: string;
}
export interface WebAuthnAssertionVerifyToMintRequest {
    signature: string;
    signatureBase: string;
    credentialPublicKey: string;
}
export interface GetAuthStatusRequestParams {
    requestId: string;
}
export interface GetAuthStatusResponse {
    status?: AuthStatus;
    pkpTokenId?: string;
    pkpEthAddress?: string;
    pkpPublicKey?: string;
    error?: string;
}
export declare enum AuthStatus {
    InProgress = "InProgress",
    Succeeded = "Succeeded",
    Failed = "Failed"
}
export interface StoreConditionRequest {
    sessionSig: SessionSig;
    key: string;
    value: string;
    securityHash: string;
    chainId: number;
    permanent: boolean;
    capabilityProtocolPrefix: CapabilityProtocolPrefix;
}
export interface StoreConditionResponse {
    txHash?: string;
    error?: string;
}
export interface StoreConditionWithSigner {
    key: string;
    value: string;
    securityHash: string;
    chainId: number;
    permanent: boolean;
    creatorAddress: string;
}
export interface AuthSig {
    sig: string;
    derivedVia: string;
    signedMessage: string;
    address: string;
}
export interface SessionSig {
    sig: string;
    derivedVia: string;
    signedMessage: string;
    address: string;
    algo: string;
}
export interface SessionSigSignedMessage {
    sessionKey: string;
    resources: string[];
    capabilities: Array<AuthSig>;
    issuedAt: string;
    expiration: string;
}
export interface Config {
    redisUrl: string;
    port: number;
}
export declare enum CapabilityProtocolPrefix {
    LitEncryptionCondition = "litEncryptionCondition",
    LitSigningCondition = "litSigningCondition"
}
export interface CapabilityObject {
    def?: string[];
    tar?: {
        [key: string]: string;
    };
    ext?: {
        [key: string]: string;
    };
}
export declare enum AuthMethodType {
    EthWallet = 1,
    LitAction = 2,
    WebAuthn = 3,
    Discord = 4,
    Google = 5,
    GoogleJwt = 6
}
export interface PKP {
    tokenId: string;
    publicKey: string;
    ethAddress: string;
}
