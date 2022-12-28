"use strict";
// copy-🍝 from https://github.com/MasterKale/SimpleWebAuthn/blob/33528afe001d4aca62052dce204c0398c3127ffd/packages/server/src/helpers/verifySignature.ts#L31
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignature = void 0;
const crypto_1 = __importDefault(require("crypto"));
const cbor_1 = __importDefault(require("cbor"));
const ed25519_1 = require("@noble/ed25519");
const convertCOSEtoPKCS_1 = require("./convertCOSEtoPKCS");
const convertCertBufferToPEM_1 = require("./convertCertBufferToPEM");
const convertPublicKeyToPEM_1 = require("./convertPublicKeyToPEM");
/**
 * Verify an authenticator's signature
 *
 * @param signature attStmt.sig
 * @param signatureBase Output from Buffer.concat()
 * @param publicKey Authenticator's public key as a PEM certificate
 * @param algo Which algorithm to use to verify the signature (default: `'sha256'`)
 */
async function verifySignature(opts) {
    const { signature, signatureBase, hashAlgorithm = "sha256" } = opts;
    const _isLeafcertOpts = isLeafCertOpts(opts);
    const _isCredPubKeyOpts = isCredPubKeyOpts(opts);
    if (!_isLeafcertOpts && !_isCredPubKeyOpts) {
        throw new Error('Must declare either "leafCert" or "credentialPublicKey"');
    }
    if (_isLeafcertOpts && _isCredPubKeyOpts) {
        throw new Error('Must not declare both "leafCert" and "credentialPublicKey"');
    }
    let publicKeyPEM = "";
    if (_isCredPubKeyOpts) {
        const { credentialPublicKey } = opts;
        // Decode CBOR to COSE
        let struct;
        try {
            struct = cbor_1.default.decodeAllSync(credentialPublicKey)[0];
        }
        catch (err) {
            const _err = err;
            throw new Error(`Error decoding public key while converting to PEM: ${_err.message}`);
        }
        const kty = struct.get(convertCOSEtoPKCS_1.COSEKEYS.kty);
        if (!kty) {
            throw new Error("Public key was missing kty");
        }
        // Check key type
        if (kty === convertCOSEtoPKCS_1.COSEKTY.OKP) {
            // Verify Ed25519 slightly differently
            const x = struct.get(convertCOSEtoPKCS_1.COSEKEYS.x);
            if (!x) {
                throw new Error("Public key was missing x (OKP)");
            }
            return (0, ed25519_1.verify)(signature, signatureBase, x);
        }
        else {
            // Convert pubKey to PEM for ECC and RSA
            publicKeyPEM = (0, convertPublicKeyToPEM_1.convertPublicKeyToPEM)(credentialPublicKey);
        }
    }
    if (_isLeafcertOpts) {
        const { leafCert } = opts;
        publicKeyPEM = (0, convertCertBufferToPEM_1.convertCertBufferToPEM)(leafCert);
    }
    return crypto_1.default
        .createVerify(hashAlgorithm)
        .update(signatureBase)
        .verify(publicKeyPEM, signature);
}
exports.verifySignature = verifySignature;
function isLeafCertOpts(opts) {
    return (Object.keys(opts).indexOf("leafCert") >=
        0);
}
function isCredPubKeyOpts(opts) {
    return (Object.keys(opts).indexOf("credentialPublicKey") >= 0);
}
//# sourceMappingURL=verifySignature.js.map