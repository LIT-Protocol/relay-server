import type { RegistrationCredential } from "@simplewebauthn/typescript-types";
import { ethers } from "ethers";

export type NetworkType = "datil-dev" | "datil-test" | "datil";

export interface AuthMethodVerifyRegistrationResponse {
  requestId?: string;
  error?: string;
}

export interface WebAuthnVerifyRegistrationRequest {
  credential: RegistrationCredential;
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

export interface Claim {
  derivedKeyId: string;
  signatures: ethers.Signature[];
  pubkey: string;
  authMethodType: number;
}

export interface ClaimAndMintResponse {
  tx: string;
}

export enum AuthStatus {
  InProgress = "InProgress",
  Succeeded = "Succeeded",
  Failed = "Failed",
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
  network: NetworkType;
}
