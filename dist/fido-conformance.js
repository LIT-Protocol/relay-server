"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MDS3ROOT = exports.fidoRouteSuffix = exports.fidoConformanceRouter = void 0;
/* eslint-disable @typescript-eslint/no-var-requires */
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const base64url_1 = __importDefault(require("base64url"));
const server_1 = require("@simplewebauthn/server");
const index_1 = require("./index");
/**
 * Create paths specifically for testing with the FIDO Conformance Tools
 */
exports.fidoConformanceRouter = express_1.default.Router();
exports.fidoRouteSuffix = "/fido";
const rpName = "FIDO Conformance Test";
/**
 * Load JSON metadata statements provided by the Conformance Tools
 *
 * FIDO2 > TESTS CONFIGURATION > DOWNLOAD SERVER METADATA (button)
 */
const statements = [];
try {
    // Update this to whatever folder you extracted the statements to
    const conformanceMetadataPath = "./fido-conformance-mds";
    const conformanceMetadataFilenames = fs_1.default.readdirSync(conformanceMetadataPath);
    for (const statementPath of conformanceMetadataFilenames) {
        if (statementPath.endsWith(".json")) {
            const contents = fs_1.default.readFileSync(`${conformanceMetadataPath}/${statementPath}`, "utf-8");
            statements.push(JSON.parse(contents));
        }
    }
}
catch (err) {
    // pass
}
/**
 * Initialize MetadataService with Conformance Testing-specific statements.
 */
(0, node_fetch_1.default)("https://mds3.certinfra.fidoalliance.org/getEndpoints", {
    method: "POST",
    body: JSON.stringify({ endpoint: `${index_1.expectedOrigin}${exports.fidoRouteSuffix}` }),
    headers: { "Content-Type": "application/json" },
})
    .then((resp) => resp.json())
    .then((json) => {
    const mdsServers = json.result;
    return server_1.MetadataService.initialize({
        statements,
        mdsServers,
        verificationMode: "strict",
    });
})
    .catch(console.error)
    .finally(() => {
    console.log("🔐 FIDO Conformance routes ready");
});
const inMemoryUserDeviceDB = {
// [username]: string: {
//   id: loggedInUserId,
//   username: 'user@yourdomain.com',
//   devices: [
//     /**
//      * {
//      *   credentialID: string,
//      *   publicKey: string,
//      *   counter: number,
//      * }
//      */
//   ],
//   currentChallenge: undefined,
//   currentAuthenticationUserVerification: undefined,
// },
};
// A cheap way of remembering who's "logged in" between the request for options and the response
let loggedInUsername = undefined;
const supportedAlgorithmIDs = [
    -7, -8, -35, -36, -37, -38, -39, -257, -258, -259, -65535,
];
/**
 * [FIDO2] Server Tests > MakeCredential Request
 */
exports.fidoConformanceRouter.post("/attestation/options", (req, res) => {
    const { body } = req;
    const { username, displayName, authenticatorSelection, attestation, extensions, } = body;
    loggedInUsername = username;
    let user = inMemoryUserDeviceDB[username];
    if (!user) {
        const newUser = {
            id: username,
            username,
            devices: [],
        };
        inMemoryUserDeviceDB[username] = newUser;
        user = newUser;
    }
    const { devices } = user;
    const opts = (0, server_1.generateRegistrationOptions)({
        rpName,
        rpID: index_1.rpID,
        userID: username,
        userName: username,
        userDisplayName: displayName,
        attestationType: attestation,
        authenticatorSelection,
        extensions,
        excludeCredentials: devices.map((dev) => ({
            id: dev.credentialID,
            type: "public-key",
            transports: ["usb", "ble", "nfc", "internal"],
        })),
        supportedAlgorithmIDs,
    });
    user.currentChallenge = opts.challenge;
    return res.send({
        ...opts,
        status: "ok",
        errorMessage: "",
    });
});
/**
 * [FIDO2] Server Tests > MakeCredential Response
 */
exports.fidoConformanceRouter.post("/attestation/result", async (req, res) => {
    const body = req.body;
    const user = inMemoryUserDeviceDB[`${loggedInUsername}`];
    const expectedChallenge = user.currentChallenge;
    let verification;
    try {
        verification = await (0, server_1.verifyRegistrationResponse)({
            credential: body,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin: index_1.expectedOrigin,
            supportedAlgorithmIDs,
        });
    }
    catch (error) {
        const _error = error;
        console.error(`RP - registration: ${_error.message}`);
        return res.status(400).send({ errorMessage: _error.message });
    }
    const { verified, registrationInfo } = verification;
    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = registrationInfo;
        const existingDevice = user.devices.find((device) => device.credentialID === credentialID);
        if (!existingDevice) {
            /**
             * Add the returned device to the user's list of devices
             */
            user.devices.push({
                credentialPublicKey,
                credentialID,
                counter,
            });
        }
    }
    return res.send({
        status: verified ? "ok" : "",
        errorMessage: "",
    });
});
/**
 * [FIDO2] Server Tests > GetAuthentication Request
 */
exports.fidoConformanceRouter.post("/assertion/options", (req, res) => {
    const { body } = req;
    const { username, userVerification, extensions } = body;
    loggedInUsername = username;
    const user = inMemoryUserDeviceDB[username];
    const { devices } = user;
    const opts = (0, server_1.generateAuthenticationOptions)({
        extensions,
        userVerification,
        allowCredentials: devices.map((dev) => ({
            id: dev.credentialID,
            type: "public-key",
            transports: ["usb", "ble", "nfc", "internal"],
        })),
    });
    user.currentChallenge = opts.challenge;
    user.currentAuthenticationUserVerification = userVerification;
    return res.send({
        ...opts,
        status: "ok",
        errorMessage: "",
    });
});
exports.fidoConformanceRouter.post("/assertion/result", async (req, res) => {
    const body = req.body;
    const { id } = body;
    const user = inMemoryUserDeviceDB[`${loggedInUsername}`];
    // Pull up values specified when generation authentication options
    const expectedChallenge = user.currentChallenge;
    const userVerification = user.currentAuthenticationUserVerification;
    if (!id) {
        const msg = `Invalid id: ${id}`;
        console.error(`RP - authentication: ${msg}`);
        return res.status(400).send({ errorMessage: msg });
    }
    const credIDBuffer = base64url_1.default.toBuffer(id);
    const existingDevice = user.devices.find((device) => device.credentialID.equals(credIDBuffer));
    if (!existingDevice) {
        const msg = `Could not find device matching ${id}`;
        console.error(`RP - authentication: ${msg}`);
        return res.status(400).send({ errorMessage: msg });
    }
    let verification;
    try {
        verification = await (0, server_1.verifyAuthenticationResponse)({
            credential: body,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin: index_1.expectedOrigin,
            expectedRPID: index_1.rpID,
            authenticator: existingDevice,
            advancedFIDOConfig: { userVerification },
        });
    }
    catch (error) {
        const _error = error;
        console.error(`RP - authentication: ${_error.message}`);
        return res.status(400).send({ errorMessage: _error.message });
    }
    const { verified, authenticationInfo } = verification;
    if (verified) {
        existingDevice.counter = authenticationInfo.newCounter;
    }
    return res.send({
        status: verified ? "ok" : "",
        errorMessage: "",
    });
});
/**
 * A catch-all for future test routes we might need to support but haven't yet defined (helps with
 * discovering which routes, what methods, and what data need to be defined)
 */
exports.fidoConformanceRouter.all("*", (req, res, next) => {
    console.log(req.url);
    console.log(req.method);
    console.log(req.body);
    next();
});
/**
 * MDS3ROOT
 *
 * Downloaded from https://mds3.certinfra.fidoalliance.org/
 *
 * Valid until 2045-01-31 @ 00:00 PST
 *
 * SHA256 Fingerprint
 * 66:D9:77:0B:57:71:10:9B:8D:83:55:7B:A2:7D:58:9B:56:BD:B3:BF:DB:DE:A2:D2:42:C4:CA:0D:57:70:A4:7C
 */
exports.MDS3ROOT = `-----BEGIN CERTIFICATE-----
MIICaDCCAe6gAwIBAgIPBCqih0DiJLW7+UHXx/o1MAoGCCqGSM49BAMDMGcxCzAJ
BgNVBAYTAlVTMRYwFAYDVQQKDA1GSURPIEFsbGlhbmNlMScwJQYDVQQLDB5GQUtF
IE1ldGFkYXRhIDMgQkxPQiBST09UIEZBS0UxFzAVBgNVBAMMDkZBS0UgUm9vdCBG
QUtFMB4XDTE3MDIwMTAwMDAwMFoXDTQ1MDEzMTIzNTk1OVowZzELMAkGA1UEBhMC
VVMxFjAUBgNVBAoMDUZJRE8gQWxsaWFuY2UxJzAlBgNVBAsMHkZBS0UgTWV0YWRh
dGEgMyBCTE9CIFJPT1QgRkFLRTEXMBUGA1UEAwwORkFLRSBSb290IEZBS0UwdjAQ
BgcqhkjOPQIBBgUrgQQAIgNiAASKYiz3YltC6+lmxhPKwA1WFZlIqnX8yL5RybSL
TKFAPEQeTD9O6mOz+tg8wcSdnVxHzwnXiQKJwhrav70rKc2ierQi/4QUrdsPes8T
EirZOkCVJurpDFbXZOgs++pa4XmjYDBeMAsGA1UdDwQEAwIBBjAPBgNVHRMBAf8E
BTADAQH/MB0GA1UdDgQWBBQGcfeCs0Y8D+lh6U5B2xSrR74eHTAfBgNVHSMEGDAW
gBQGcfeCs0Y8D+lh6U5B2xSrR74eHTAKBggqhkjOPQQDAwNoADBlAjEA/xFsgri0
xubSa3y3v5ormpPqCwfqn9s0MLBAtzCIgxQ/zkzPKctkiwoPtDzI51KnAjAmeMyg
X2S5Ht8+e+EQnezLJBJXtnkRWY+Zt491wgt/AwSs5PHHMv5QgjELOuMxQBc=
-----END CERTIFICATE-----
`;
// Set above root cert for use by MetadataService
server_1.SettingsService.setRootCertificates({
    identifier: "mds",
    certificates: [exports.MDS3ROOT],
});
// Reset preset root certificates
server_1.SettingsService.setRootCertificates({ identifier: "apple", certificates: [] });
server_1.SettingsService.setRootCertificates({
    identifier: "android-key",
    certificates: [],
});
server_1.SettingsService.setRootCertificates({
    identifier: "android-safetynet",
    certificates: [],
});
//# sourceMappingURL=fido-conformance.js.map