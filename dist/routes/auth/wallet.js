"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletVerifyToFetchPKPsHandler = exports.walletVerifyToMintHandler = void 0;
const models_1 = require("../../models");
const ethers_1 = require("ethers");
const lit_1 = require("../../lit");
// Check that the message has been signed by the given address
function verifyAuthSig(authSig) {
    const recoveredAddr = ethers_1.utils.verifyMessage(authSig.signedMessage, authSig.sig);
    return recoveredAddr.toLowerCase() === authSig.address.toLowerCase();
}
// Mint PKP for verified Eth wallet
async function walletVerifyToMintHandler(req, res) {
    // get wallet auth sig from body
    const authSig = req.body;
    // verify auth sig
    const verified = verifyAuthSig(authSig);
    if (verified) {
        console.info("Successfully verified authentication signature", {
            address: authSig.address,
        });
    }
    else {
        console.error("Unable to verify authentication signature", {
            address: authSig.address,
        });
        return res.status(400).json({
            error: "Unable to verify authentication signature",
        });
    }
    // mint PKP for user
    try {
        const idForAuthMethod = authSig.address;
        const mintTx = await (0, lit_1.mintPKP)({
            authMethodType: models_1.AuthMethodType.EthWallet,
            idForAuthMethod,
        });
        console.info("Minting PKP with Eth wallet", {
            requestId: mintTx.hash,
        });
        return res.status(200).json({
            requestId: mintTx.hash,
        });
    }
    catch (err) {
        console.error("Unable to mint PKP for given Eth wallet", { err });
        return res.status(500).json({
            error: "Unable to mint PKP for given Eth wallet",
        });
    }
}
exports.walletVerifyToMintHandler = walletVerifyToMintHandler;
// Fetch PKPs for verified Eth wallet
async function walletVerifyToFetchPKPsHandler(req, res) {
    // get auth sig from body
    const authSig = req.body;
    // verify auth sig
    const verified = verifyAuthSig(authSig);
    if (verified) {
        console.info("Successfully verified authentication signature", {
            address: authSig.address,
        });
    }
    else {
        console.error("Unable to verify authentication signature", {
            address: authSig.address,
        });
        return res.status(400).json({
            error: "Unable to verify authentication signature",
        });
    }
    // fetch PKP for user
    try {
        const idForAuthMethod = authSig.address;
        const pkps = await (0, lit_1.getPKPsForAuthMethod)({
            authMethodType: models_1.AuthMethodType.EthWallet,
            idForAuthMethod,
        });
        console.info("Fetched PKPs with Eth wallet", {
            pkps: pkps,
        });
        return res.status(200).json({
            pkps: pkps,
        });
    }
    catch (err) {
        console.error("Unable to fetch PKPs for given Eth wallet", { err });
        return res.status(500).json({
            error: "Unable to fetch PKPs for given Eth wallet",
        });
    }
}
exports.walletVerifyToFetchPKPsHandler = walletVerifyToFetchPKPsHandler;
//# sourceMappingURL=wallet.js.map