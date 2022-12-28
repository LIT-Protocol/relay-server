/// <reference types="node" />
import { COSEAlgorithmIdentifier } from "@simplewebauthn/typescript-types";
/**
 * Takes COSE-encoded public key and converts it to PKCS key
 */
export declare function convertCOSEtoPKCS(cosePublicKey: Buffer): Buffer;
export declare type COSEPublicKey = Map<COSEAlgorithmIdentifier, number | Buffer>;
export declare enum COSEKEYS {
    kty = 1,
    alg = 3,
    crv = -1,
    x = -2,
    y = -3,
    n = -1,
    e = -2
}
export declare enum COSEKTY {
    OKP = 1,
    EC2 = 2,
    RSA = 3
}
export declare const COSERSASCHEME: {
    [key: string]: SigningSchemeHash;
};
export declare const COSECRV: {
    [key: number]: string;
};
export declare const COSEALGHASH: {
    [key: string]: string;
};
/**
 * Imported from node-rsa's types
 */
declare type SigningSchemeHash = "pkcs1-ripemd160" | "pkcs1-md4" | "pkcs1-md5" | "pkcs1-sha" | "pkcs1-sha1" | "pkcs1-sha224" | "pkcs1-sha256" | "pkcs1-sha384" | "pkcs1-sha512" | "pss-ripemd160" | "pss-md4" | "pss-md5" | "pss-sha" | "pss-sha1" | "pss-sha224" | "pss-sha256" | "pss-sha384" | "pss-sha512";
export {};