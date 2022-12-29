"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webAuthnAssertionVerifyToMintHandler = void 0;
const ethers_1 = require("ethers");
const lit_1 = require("../../lit");
const models_1 = require("../../models");
const verifySignature_1 = require("../../utils/webAuthn/verifySignature");
const keys_1 = require("../../utils/webAuthn/keys");
const utils_1 = require("ethers/lib/utils");
async function webAuthnAssertionVerifyToMintHandler(req, res) {
    // get parameters from body
    const { signature, signatureBase, credentialPublicKey } = req.body;
    // verify WebAuthn signature
    try {
        const signatureValid = await (0, verifySignature_1.verifySignature)({
            signature: Buffer.from(ethers_1.utils.arrayify(signature)),
            signatureBase: Buffer.from(ethers_1.utils.arrayify(signatureBase)),
            credentialPublicKey: Buffer.from(ethers_1.utils.arrayify(credentialPublicKey)),
        });
        if (!signatureValid) {
            return res.status(400).json({
                error: "Invalid signature",
            });
        }
        console.info("Signature valid", { credentialPublicKey });
    }
    catch (err) {
        console.error("Unable to verify signature", { err });
        return res.status(500).json({
            error: "Unable to verify signature",
        });
    }
    // mint PKP for user
    try {
        const decodedPublicKey = (0, keys_1.decodeECKeyAndGetPublicKey)(Buffer.from(ethers_1.utils.arrayify(credentialPublicKey)));
        console.log("Deriving ID for auth method", { decodedPublicKey });
        const idForAuthMethod = ethers_1.utils.keccak256((0, utils_1.toUtf8Bytes)(`0x${decodedPublicKey}:TODO:`));
        const mintTx = await (0, lit_1.mintPKP)({
            authMethodType: models_1.AuthMethodType.WebAuthn,
            idForAuthMethod,
        });
        return res.status(200).json({
            requestId: mintTx.hash,
        });
    }
    catch (err) {
        console.error("Unable to mint PKP for user", { err });
        return res.status(500).json({
            error: "Unable to mint PKP for user",
        });
    }
}
exports.webAuthnAssertionVerifyToMintHandler = webAuthnAssertionVerifyToMintHandler;
//# sourceMappingURL=webAuthn.js.map