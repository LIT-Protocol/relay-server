import { LIT_NETWORK_VALUES } from "@lit-protocol/constants";
import type { RegistrationCredentialJSON } from "@simplewebauthn/typescript-types";
import { ethers } from "ethers";

export interface GoogleOAuthVerifyRegistrationRequest {
	idToken: string;
}

export interface DiscordOAuthVerifyRegistrationRequest {
	accessToken: string;
}

export interface OTPAuthVerifyRegistrationRequest {
	accessToken: string;
}

export interface MintNextAndAddAuthMethodsRequest {
	keyType: string;
	permittedAuthMethodTypes: string[];
	permittedAuthMethodIds: string[];
	permittedAuthMethodPubkeys: string[];
	permittedAuthMethodScopes: string[][];
	addPkpEthAddressAsPermittedAddress: boolean;
	sendPkpToItself: boolean;
	burnPkp?: boolean;
	sendToAddressAfterMinting?: string;
	pkpEthAddressScopes?: string[];
}

export interface Claim {
	derivedKeyId: string;
	signatures: ethers.Signature[];
	pubkey: string;
	authMethodType: number;
}

export interface ClaimAndMintResponse {
	tx: string;
}
export interface MintNextAndAddAuthMethodsResponse
	extends AuthMethodVerifyRegistrationResponse {}

export interface FetchRequest {
	authMethodId: string;
	authMethodType: number;
	authMethodPubKey?: string;
}

export interface AuthMethodVerifyRegistrationResponse {
	requestId?: string;
	error?: string;
}

export interface AuthMethodVerifyToFetchResponse {
	pkps?: PKP[];
	error?: string;
}

export interface WebAuthnVerifyRegistrationRequest {
	credential: RegistrationCredentialJSON;
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

export interface OtpVerificationPayload {
	userId: string;
	status: boolean;
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

export interface Contract {
	accessControlConditionsAddress: string;
	pkpHelperAddress: string;
	pkpPermissionsAddress: string;
	pkpNftAddress: string;
}

export interface Config {
	redisUrl: string;
	port: number;
	enableHttps: boolean;
	expectedOrigins: string[];
	serranoContract?: Contract;
	cayenneContracts?: Contract;
	datilDevContracts?: Contract;
	useSoloNet: boolean;
	network: LIT_NETWORK_VALUES;
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
	OTP,
	StytchOtp = 9,
}

export interface PKP {
	tokenId: string;
	publicKey: string;
	ethAddress: string;
}

export interface ResolvedAuthMethod {
	appId: string;
	userId: string;
}

export interface SendTxnRequest {
	txn: ethers.Transaction;
}

export interface SendTxnResponse {
	requestId?: string;
	error?: string;
}
