"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discordOAuthVerifyToFetchPKPsHandler = exports.discordOAuthVerifyToMintHandler = void 0;
const models_1 = require("../../models");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const lit_1 = require("../../lit");
const APP_ID = process.env.DISCORD_CLIENT_ID || "105287423965869266";
// Verify Discord access token by fetching current user info
async function verifyAndFetchDiscordUserId(accessToken) {
    const meResponse = await fetch("https://discord.com/api/users/@me", {
        method: "GET",
        headers: {
            authorization: `Bearer ${accessToken}`,
        },
    });
    if (meResponse.ok) {
        const user = await meResponse.json();
        return user.id;
    }
    else {
        throw new Error("Unable to verify Discord account");
    }
}
// Mint PKP for verified Discord account
async function discordOAuthVerifyToMintHandler(req, res) {
    // get Discord access token from body
    const { accessToken } = req.body;
    // verify access token by fetching user info
    let userId;
    try {
        userId = await verifyAndFetchDiscordUserId(accessToken);
        console.info("Successfully verified Discord account", {
            userId: userId,
        });
    }
    catch (err) {
        return res.status(400).json({
            error: "Unable to verify Discord account",
        });
    }
    // mint PKP for user
    try {
        const idForAuthMethod = ethers_1.utils.keccak256((0, utils_1.toUtf8Bytes)(`${userId}:${APP_ID}`));
        const mintTx = await (0, lit_1.mintPKP)({
            authMethodType: models_1.AuthMethodType.Discord,
            idForAuthMethod,
        });
        console.info("Minting PKP with Discord auth", {
            requestId: mintTx.hash,
        });
        return res.status(200).json({
            requestId: mintTx.hash,
        });
    }
    catch (err) {
        console.error("Unable to mint PKP for given Discord account", { err });
        return res.status(500).json({
            error: "Unable to mint PKP for given Discord account",
        });
    }
}
exports.discordOAuthVerifyToMintHandler = discordOAuthVerifyToMintHandler;
// Fetch PKPs for verified Discord account
async function discordOAuthVerifyToFetchPKPsHandler(req, res) {
    // get Discord access token from body
    const { accessToken } = req.body;
    // verify access token by fetching user info
    let userId;
    try {
        userId = await verifyAndFetchDiscordUserId(accessToken);
        console.info("Successfully verified Discord account", {
            userId: userId,
        });
    }
    catch (err) {
        return res.status(400).json({
            error: "Unable to verify Discord account",
        });
    }
    // fetch PKP for user
    try {
        const idForAuthMethod = ethers_1.utils.keccak256((0, utils_1.toUtf8Bytes)(`${userId}:${APP_ID}`));
        const pkps = await (0, lit_1.getPKPsForAuthMethod)({
            authMethodType: models_1.AuthMethodType.Discord,
            idForAuthMethod,
        });
        console.info("Fetched PKPs with Discord auth", {
            pkps: pkps,
        });
        return res.status(200).json({
            pkps: pkps,
        });
    }
    catch (err) {
        console.error("Unable to fetch PKPs for given Discord account", {
            err,
        });
        return res.status(500).json({
            error: "Unable to fetch PKPs for given Discord account",
        });
    }
}
exports.discordOAuthVerifyToFetchPKPsHandler = discordOAuthVerifyToFetchPKPsHandler;
//# sourceMappingURL=discord.js.map