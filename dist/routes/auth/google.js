"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleOAuthVerifyToFetchPKPsHandler = exports.googleOAuthVerifyToMintHandler = void 0;
const models_1 = require("../../models");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const lit_1 = require("../../lit");
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ||
    "355007986731-llbjq5kbsg8ieb705mo64nfnh88dhlmn.apps.googleusercontent.com";
// Validate given Google ID token
async function verifyIDToken(idToken) {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, {
        method: "GET",
    });
    return response.json();
}
// Mint PKP for verified Google account
async function googleOAuthVerifyToMintHandler(req, res) {
    // get idToken from body
    const { idToken } = req.body;
    // verify Google ID token
    let tokenPayload = null;
    try {
        tokenPayload = await verifyIDToken(idToken);
        console.info("Successfully verified Google account", {
            userId: tokenPayload.sub,
        });
    }
    catch (err) {
        console.error("Unable to verify Google account", { err });
        return res.status(400).json({
            error: "Unable to verify Google account",
        });
    }
    // mint PKP for user
    try {
        const idForAuthMethod = ethers_1.utils.keccak256((0, utils_1.toUtf8Bytes)(`${tokenPayload.sub}:${tokenPayload.aud}`));
        const mintTx = await (0, lit_1.mintPKP)({
            authMethodType: models_1.AuthMethodType.GoogleJwt,
            idForAuthMethod,
        });
        console.info("Minting PKP with Google auth", {
            requestId: mintTx.hash,
        });
        return res.status(200).json({
            requestId: mintTx.hash,
        });
    }
    catch (err) {
        console.error("Unable to mint PKP for given Google account", { err });
        return res.status(500).json({
            error: "Unable to mint PKP for given Google account",
        });
    }
}
exports.googleOAuthVerifyToMintHandler = googleOAuthVerifyToMintHandler;
// Fetch PKPs for verified Google account
async function googleOAuthVerifyToFetchPKPsHandler(req, res) {
    // get idToken from body
    const { idToken } = req.body;
    // verify idToken
    let tokenPayload = null;
    try {
        tokenPayload = await verifyIDToken(idToken);
        console.info("Successfully verified Google account", {
            userId: tokenPayload.sub,
        });
    }
    catch (err) {
        console.error("Unable to verify Google account", { err });
        return res.status(400).json({
            error: "Unable to verify Google account",
        });
    }
    // fetch PKPs for user
    try {
        const idForAuthMethod = ethers_1.utils.keccak256((0, utils_1.toUtf8Bytes)(`${tokenPayload.sub}:${tokenPayload.aud}`));
        const pkps = await (0, lit_1.getPKPsForAuthMethod)({
            authMethodType: models_1.AuthMethodType.GoogleJwt,
            idForAuthMethod,
        });
        console.info("Fetched PKPs with Google auth", {
            pkps: pkps,
        });
        return res.status(200).json({
            pkps: pkps,
        });
    }
    catch (err) {
        console.error("Unable to fetch PKPs for given Google account", { err });
        return res.status(500).json({
            error: "Unable to fetch PKPs for given Google account",
        });
    }
}
exports.googleOAuthVerifyToFetchPKPsHandler = googleOAuthVerifyToFetchPKPsHandler;
//# sourceMappingURL=google.js.map