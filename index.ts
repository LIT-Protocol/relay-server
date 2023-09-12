/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * An example Express server showing off a simple integration of @simplewebauthn/server.
 *
 * The webpages served from ./public use @simplewebauthn/browser.
 */

import fs from "fs";
import http from "http";
import https from "https";

import base64url from "base64url";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

import type {
	GenerateAuthenticationOptionsOpts,
	GenerateRegistrationOptionsOpts,
} from "@simplewebauthn/server";
import {
	// Authentication
	generateAuthenticationOptions,
	generateRegistrationOptions,
} from "@simplewebauthn/server";

import { LoggedInUser } from "./example-server";

import cors from "cors";
import {
	googleOAuthVerifyToMintHandler,
	googleOAuthVerifyToFetchPKPsHandler,
} from "./routes/auth/google";
import { getAuthStatusHandler } from "./routes/auth/status";
import limiter from "./routes/middlewares/limiter";
import { storeConditionHandler } from "./routes/storeCondition";
import apiKeyGateAndTracking from "./routes/middlewares/apiKeyGateAndTracking";
import {
	webAuthnVerifyRegistrationHandler,
	webAuthnGenerateRegistrationOptionsHandler,
	webAuthnVerifyToFetchPKPsHandler,
} from "./routes/auth/webAuthn";
import {
	discordOAuthVerifyToFetchPKPsHandler,
	discordOAuthVerifyToMintHandler,
} from "./routes/auth/discord";
import {
	walletVerifyToMintHandler,
	walletVerifyToFetchPKPsHandler,
} from "./routes/auth/wallet";

import {
	fetchPKPsHandler,
	mintNextAndAddAuthMethodsHandler,
} from "./routes/auth/mintAndFetch";

import config from "./config";
import {
	stytchOtpVerifyToFetchPKPsHandler,
	stytchOtpVerifyToMintHandler,
} from "./routes/auth/stytchOtp";

import { mintClaimedKeyId } from "./routes/auth/claim";

const app = express();

const { ENABLE_CONFORMANCE, ENABLE_HTTPS, RP_ID = "localhost" } = process.env;

app.use(express.static("./public/"));
app.use(express.json());
app.use(cors());

app.use(limiter);
app.use(apiKeyGateAndTracking);

/**
 * If the words "metadata statements" mean anything to you, you'll want to enable this route. It
 * contains an example of a more complex deployment of SimpleWebAuthn with support enabled for the
 * FIDO Metadata Service. This enables greater control over the types of authenticators that can
 * interact with the Rely Party (a.k.a. "RP", a.k.a. "this server").
 */
if (ENABLE_CONFORMANCE === "true") {
	import("./fido-conformance").then(
		({ fidoRouteSuffix, fidoConformanceRouter }) => {
			app.use(fidoRouteSuffix, fidoConformanceRouter);
		},
	);
}

/**
 * RP ID represents the "scope" of websites on which a authenticator should be usable. The Origin
 * represents the expected URL from which registration or authentication occurs.
 */
export const rpID = RP_ID;

/**
 * 2FA and Passwordless WebAuthn flows expect you to be able to uniquely identify the user that
 * performs registration or authentication. The user ID you specify here should be your internal,
 * _unique_ ID for that user (uuid, etc...). Avoid using identifying information here, like email
 * addresses, as it may be stored within the authenticator.
 *
 * Here, the example server assumes the following user has completed login:
 */
const loggedInUserId = "internalUserId";

const inMemoryUserDeviceDB: { [loggedInUserId: string]: LoggedInUser } = {
	[loggedInUserId]: {
		id: loggedInUserId,
		username: `user@${rpID}`,
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
		username,
		devices,
	} = user;

	const opts: GenerateRegistrationOptionsOpts = {
		rpName: "SimpleWebAuthn Example",
		rpID,
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

	const options = generateRegistrationOptions(opts);

	/**
	 * The server needs to temporarily remember this value for verification, so don't lose it until
	 * after you verify an authenticator response.
	 */
	inMemoryUserDeviceDB[loggedInUserId].currentChallenge = options.challenge;

	res.send(options);
});

/**
 * Login (a.k.a. "Authentication")
 */
app.get("/generate-authentication-options", (req, res) => {
	// You need to know the user by this point
	const user = inMemoryUserDeviceDB[loggedInUserId];

	const opts: GenerateAuthenticationOptionsOpts = {
		timeout: 60000,
		allowCredentials: user.devices.map((dev) => ({
			id: dev.credentialID,
			type: "public-key",
			transports: dev.transports,
		})),
		userVerification: "required",
		rpID,
	};

	const options = generateAuthenticationOptions(opts);

	/**
	 * The server needs to temporarily remember this value for verification, so don't lose it until
	 * after you verify an authenticator response.
	 */
	inMemoryUserDeviceDB[loggedInUserId].currentChallenge = options.challenge;

	res.send(options);
});

// --- Store condition
app.post("/store-condition", storeConditionHandler);

// --- Mint PKP for authorized account
app.post("/mint-next-and-add-auth-methods", mintNextAndAddAuthMethodsHandler);

// --- Fetch PKPs tied to authorized account
app.post("/fetch-pkps-by-auth-method", fetchPKPsHandler);

// --- Poll minting progress
app.get("/auth/status/:requestId", getAuthStatusHandler);

// *** Deprecated ***

app.post("/auth/google", googleOAuthVerifyToMintHandler);
app.post("/auth/discord", discordOAuthVerifyToMintHandler);
app.post("/auth/wallet", walletVerifyToMintHandler);
app.post("/auth/stytch-otp", stytchOtpVerifyToMintHandler);

app.post("/auth/google/userinfo", googleOAuthVerifyToFetchPKPsHandler);
app.post("/auth/discord/userinfo", discordOAuthVerifyToFetchPKPsHandler);
app.post("/auth/wallet/userinfo", walletVerifyToFetchPKPsHandler);
app.post("/auth/stytch-otp/userinfo", stytchOtpVerifyToFetchPKPsHandler);

app.post("/auth/webauthn/userinfo", webAuthnVerifyToFetchPKPsHandler);

app.post(
	"/auth/webauthn/verify-registration",
	webAuthnVerifyRegistrationHandler,
);
app.get(
	"/auth/webauthn/generate-registration-options",
	webAuthnGenerateRegistrationOptionsHandler,
);
app.post("/auth/claim", mintClaimedKeyId);


if (ENABLE_HTTPS) {
	const host = "0.0.0.0";
	const port = 443;

	https
		.createServer(
			{
				/**
				 * See the README on how to generate this SSL cert and key pair using mkcert
				 */
				key: fs.readFileSync(`./${rpID}.key`),
				cert: fs.readFileSync(`./${rpID}.crt`),
			},
			app,
		)
		.listen(port, host, () => {
			console.log(`🚀 Server ready at ${host}:${port}`);
		});
} else {
	const host = "127.0.0.1";
	const port = config.port;

	http.createServer(app).listen(port, () => {
		console.log(`🚀 Server ready at ${host}:${port}`);
	});
}
