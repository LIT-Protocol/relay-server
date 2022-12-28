/// <reference types="node" />
import type { Base64URLString } from "@simplewebauthn/typescript-types";
/**
 * Convert buffer to an OpenSSL-compatible PEM text format.
 */
export declare function convertCertBufferToPEM(certBuffer: Buffer | Base64URLString): string;