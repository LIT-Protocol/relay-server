"use strict";
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * An example Express server showing off a simple integration of @simplewebauthn/server.
 *
 * The webpages served from ./public use @simplewebauthn/browser.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectedOrigin = exports.rpID = void 0;
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const base64url_1 = __importDefault(require("base64url"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
dotenv_1.default.config();
const server_1 = require("@simplewebauthn/server");
const cors_1 = __importDefault(require("cors"));
const google_1 = require("./routes/auth/google");
const status_1 = require("./routes/auth/status");
const limiter_1 = __importDefault(require("./routes/middlewares/limiter"));
const storeCondition_1 = require("./routes/storeCondition");
const webAuthn_1 = require("./routes/auth/webAuthn");
const discord_1 = require("./routes/auth/discord");
const wallet_1 = require("./routes/auth/wallet");
const apiKeyGateAndTracking_1 = __importDefault(require("./routes/middlewares/apiKeyGateAndTracking"));
const app = (0, express_1.default)();
const { ENABLE_CONFORMANCE, ENABLE_HTTPS, RP_ID = "localhost", PORT = "8000", } = process.env;
app.use(express_1.default.static("./public/"));
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use(limiter_1.default);
app.use(apiKeyGateAndTracking_1.default);
/**
 * If the words "metadata statements" mean anything to you, you'll want to enable this route. It
 * contains an example of a more complex deployment of SimpleWebAuthn with support enabled for the
 * FIDO Metadata Service. This enables greater control over the types of authenticators that can
 * interact with the Rely Party (a.k.a. "RP", a.k.a. "this server").
 */
if (ENABLE_CONFORMANCE === "true") {
    Promise.resolve().then(() => __importStar(require("./fido-conformance"))).then(({ fidoRouteSuffix, fidoConformanceRouter }) => {
        app.use(fidoRouteSuffix, fidoConformanceRouter);
    });
}
/**
 * RP ID represents the "scope" of websites on which a authenticator should be usable. The Origin
 * represents the expected URL from which registration or authentication occurs.
 */
exports.rpID = RP_ID;
// This value is set at the bottom of page as part of server initialization (the empty string is
// to appease TypeScript until we determine the expected origin based on whether or not HTTPS
// support is enabled)
exports.expectedOrigin = "";
/**
 * 2FA and Passwordless WebAuthn flows expect you to be able to uniquely identify the user that
 * performs registration or authentication. The user ID you specify here should be your internal,
 * _unique_ ID for that user (uuid, etc...). Avoid using identifying information here, like email
 * addresses, as it may be stored within the authenticator.
 *
 * Here, the example server assumes the following user has completed login:
 */
const loggedInUserId = "internalUserId";
const inMemoryUserDeviceDB = {
    [loggedInUserId]: {
        id: loggedInUserId,
        username: `user@${exports.rpID}`,
        devices: [],
        /**
         * A simple way of storing a user's current challenge being signed by registration or authentication.
         * It should be expired after `timeout` milliseconds (optional argument for `generate` methods,
         * defaults to 60000ms)
         */
        currentChallenge: undefined,
    },
};
/**
 * Registration (a.k.a. "Registration")
 */
app.get("/generate-registration-options", (req, res) => {
    const user = inMemoryUserDeviceDB[loggedInUserId];
    const { 
    /**
     * The username can be a human-readable name, email, etc... as it is intended only for display.
     */
    username, devices, } = user;
    const opts = {
        rpName: "SimpleWebAuthn Example",
        rpID: exports.rpID,
        userID: loggedInUserId,
        userName: username,
        timeout: 60000,
        attestationType: "none",
        /**
         * Passing in a user's list of already-registered authenticator IDs here prevents users from
         * registering the same device multiple times. The authenticator will simply throw an error in
         * the browser if it's asked to perform registration when one of these ID's already resides
         * on it.
         */
        excludeCredentials: devices.map((dev) => ({
            id: dev.credentialID,
            type: "public-key",
            transports: dev.transports,
        })),
        /**
         * The optional authenticatorSelection property allows for specifying more constraints around
         * the types of authenticators that users to can use for registration
         */
        authenticatorSelection: {
            userVerification: "required",
            residentKey: "required",
        },
        /**
         * Support the two most common algorithms: ES256, and RS256
         */
        supportedAlgorithmIDs: [-7, -257],
    };
    const options = (0, server_1.generateRegistrationOptions)(opts);
    /**
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    inMemoryUserDeviceDB[loggedInUserId].currentChallenge = options.challenge;
    res.send(options);
});
app.post("/verify-registration", async (req, res) => {
    const body = req.body;
    const user = inMemoryUserDeviceDB[loggedInUserId];
    const expectedChallenge = user.currentChallenge;
    let verification;
    try {
        const opts = {
            credential: body,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin: exports.expectedOrigin,
            expectedRPID: exports.rpID,
            requireUserVerification: true,
        };
        verification = await (0, server_1.verifyRegistrationResponse)(opts);
    }
    catch (error) {
        const _error = error;
        console.error(_error);
        return res.status(400).send({ error: _error.message });
    }
    const { verified, registrationInfo } = verification;
    if (verified && registrationInfo) {
        console.log("registrationInfo", registrationInfo);
        const { credentialPublicKey, credentialID, counter } = registrationInfo;
        const existingDevice = user.devices.find((device) => device.credentialID.equals(credentialID));
        if (!existingDevice) {
            /**
             * Add the returned device to the user's list of devices
             */
            const newDevice = {
                credentialPublicKey,
                credentialID,
                counter,
                transports: body.transports,
            };
            user.devices.push(newDevice);
            // const packed = packAuthData({
            // credentialPublicKey,
            // credentialID,
            // counter,
            // });
            // mint the PKP with this as an auth method
            // const pkp = await mintPKP({
            //   // credentialPublicKey,
            //   // credentialID,
            //   authMethodType: AuthMethodType.WebAuthn,
            //   idForAuthMethod: // TODO:
            // });
        }
    }
    res.send({ verified });
});
/**
 * Login (a.k.a. "Authentication")
 */
app.get("/generate-authentication-options", (req, res) => {
    // You need to know the user by this point
    const user = inMemoryUserDeviceDB[loggedInUserId];
    const opts = {
        timeout: 60000,
        allowCredentials: user.devices.map((dev) => ({
            id: dev.credentialID,
            type: "public-key",
            transports: dev.transports,
        })),
        userVerification: "required",
        rpID: exports.rpID,
    };
    const options = (0, server_1.generateAuthenticationOptions)(opts);
    /**
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    inMemoryUserDeviceDB[loggedInUserId].currentChallenge = options.challenge;
    res.send(options);
});
app.post("/verify-authentication", async (req, res) => {
    const body = req.body;
    const user = inMemoryUserDeviceDB[loggedInUserId];
    const expectedChallenge = user.currentChallenge;
    let dbAuthenticator;
    const bodyCredIDBuffer = base64url_1.default.toBuffer(body.rawId);
    // "Query the DB" here for an authenticator matching `credentialID`
    for (const dev of user.devices) {
        if (dev.credentialID.equals(bodyCredIDBuffer)) {
            dbAuthenticator = dev;
            break;
        }
    }
    console.log("dbAuthenticator", dbAuthenticator);
    if (!dbAuthenticator) {
        return res
            .status(400)
            .send({ error: "Authenticator is not registered with this site" });
    }
    let verification;
    try {
        const opts = {
            credential: body,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin: exports.expectedOrigin,
            expectedRPID: exports.rpID,
            authenticator: dbAuthenticator,
            requireUserVerification: true,
        };
        verification = await (0, server_1.verifyAuthenticationResponse)(opts);
    }
    catch (error) {
        const _error = error;
        console.error(_error);
        return res.status(400).send({ error: _error.message });
    }
    const { verified, authenticationInfo } = verification;
    if (verified) {
        // Update the authenticator's counter in the DB to the newest count in the authentication
        dbAuthenticator.counter = authenticationInfo.newCounter;
    }
    // const { credentialPublicKey, credentialID, counter } = authenticationInfo;
    res.send({ verified });
});
// --- Store condition
app.post("/store-condition", storeCondition_1.storeConditionHandler);
// --- Mint PKP for authorized account
app.post("/auth/google", google_1.googleOAuthVerifyToMintHandler);
app.post("/auth/discord", discord_1.discordOAuthVerifyToMintHandler);
app.post("/auth/wallet", wallet_1.walletVerifyToMintHandler);
// TODO: Implement safe version of WebAuthn
app.post("/auth/webauthn", webAuthn_1.webAuthnAssertionVerifyToMintHandler);
// --- Fetch PKPs tied to authorized account
app.post("/auth/google/userinfo", google_1.googleOAuthVerifyToFetchPKPsHandler);
app.post("/auth/discord/userinfo", discord_1.discordOAuthVerifyToFetchPKPsHandler);
app.post("/auth/wallet/userinfo", wallet_1.walletVerifyToFetchPKPsHandler);
// --- Poll minting progress
app.get("/auth/status/:requestId", status_1.getAuthStatusHandler);
if (ENABLE_HTTPS) {
    const host = "0.0.0.0";
    const port = 443;
    exports.expectedOrigin = `https://${exports.rpID}`;
    https_1.default
        .createServer({
        /**
         * See the README on how to generate this SSL cert and key pair using mkcert
         */
        key: fs_1.default.readFileSync(`./${exports.rpID}.key`),
        cert: fs_1.default.readFileSync(`./${exports.rpID}.crt`),
    }, app)
        .listen(port, host, () => {
        console.log(`🚀 Server ready at ${exports.expectedOrigin} (${host}:${port})`);
    });
}
else {
    const host = "127.0.0.1";
    const port = parseInt(PORT);
    exports.expectedOrigin = `http://localhost:3000`;
    http_1.default.createServer(app).listen(port, () => {
        console.log(`🚀 Server ready at ${exports.expectedOrigin} (${host}:${port})`);
    });
}
//# sourceMappingURL=index.js.map