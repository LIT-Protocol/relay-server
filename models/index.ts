import type { RegistrationCredentialJSON } from "@simplewebauthn/typescript-types";

export interface GoogleOAuthVerifyRegistrationRequest {
	idToken: string;
}

export interface AuthMethodVerifyRegistrationResponse {
	requestId?: string;
	error?: string;
}

export interface WebAuthnVerifyRegistrationRequest {
	credential: RegistrationCredentialJSON;
	username: string;
}

export interface GetAuthStatusRequestParams {
	requestId: string;
}

export interface GetAuthStatusResponse {
	status?: AuthStatus;
	pkpEthAddress?: string;
	pkpPublicKey?: string;
	error?: string;
}

export enum AuthStatus {
	InProgress = "InProgress",
	Succeeded = "Succeeded",
	Failed = "Failed",
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
	rpID: string;
	enableHttps: boolean;
	origin: string;
	accessControlConditionsAddress: string;
	pkpHelperAddress: string;
	pkpPermissionsAddress: string;
	pkpNftAddress: string;
}

export enum CapabilityProtocolPrefix {
	LitEncryptionCondition = "litEncryptionCondition",
	LitSigningCondition = "litSigningCondition",
}

export interface CapabilityObject {
	def?: string[];
	tar?: { [key: string]: string };
	ext?: { [key: string]: string };
}

export enum AuthMethodType {
	EthWallet = 1,
	LitAction,
	WebAuthn,
	Discord,
	Google,
	GoogleJwt,
}
