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
	VerifiedAuthenticationResponse,
	VerifiedRegistrationResponse,
	VerifyAuthenticationResponseOpts,
	VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import {
	// Authentication
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";

import type {
	AuthenticationCredentialJSON,
	AuthenticatorDevice,
	RegistrationCredentialJSON,
} from "@simplewebauthn/typescript-types";

import { LoggedInUser } from "./example-server";

import cors from "cors";
import {
	googleOAuthVerifyToFetchPKPsHandler,
	googleOAuthVerifyToMintHandler,
} from "./routes/auth/google";
import { getAuthStatusHandler } from "./routes/auth/status";
import limiter from "./routes/middlewares/limiter";
import { storeConditionHandler } from "./routes/storeCondition";
import { webAuthnAssertionVerifyToMintHandler } from "./routes/auth/webAuthn";
import { toHash } from "./utils/toHash";
import { utils } from "ethers";
import {
	discordOAuthVerifyToFetchHandler,
	discordOAuthVerifyToMintHandler,
} from "./routes/auth/discord";
import {
	walletVerifyToMintHandler,
	walletVerifyToFetchHandler,
} from "./routes/auth/wallet";

const app = express();

const {
	ENABLE_CONFORMANCE,
	ENABLE_HTTPS,
	RP_ID = "localhost",
	PORT = "8000",
} = process.env;

app.use(express.static("./public/"));
app.use(express.json());
app.use(cors());

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
// This value is set at the bottom of page as part of server initialization (the empty string is
// to appease TypeScript until we determine the expected origin based on whether or not HTTPS
// support is enabled)
export let expectedOrigin = "";

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

app.post("/verify-registration", async (req, res) => {
	const body: RegistrationCredentialJSON = req.body;

	const user = inMemoryUserDeviceDB[loggedInUserId];

	const expectedChallenge = user.currentChallenge;

	let verification: VerifiedRegistrationResponse;
	try {
		const opts: VerifyRegistrationResponseOpts = {
			credential: body,
			expectedChallenge: `${expectedChallenge}`,
			expectedOrigin,
			expectedRPID: rpID,
			requireUserVerification: true,
		};
		verification = await verifyRegistrationResponse(opts);
	} catch (error) {
		const _error = error as Error;
		console.error(_error);
		return res.status(400).send({ error: _error.message });
	}

	const { verified, registrationInfo } = verification;

	if (verified && registrationInfo) {
		console.log("registrationInfo", registrationInfo);
		const { credentialPublicKey, credentialID, counter } = registrationInfo;

		const existingDevice = user.devices.find((device) =>
			device.credentialID.equals(credentialID),
		);

		if (!existingDevice) {
			/**
			 * Add the returned device to the user's list of devices
			 */
			const newDevice: AuthenticatorDevice = {
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

app.post("/verify-authentication", async (req, res) => {
	const body: AuthenticationCredentialJSON = req.body;

	const user = inMemoryUserDeviceDB[loggedInUserId];

	const expectedChallenge = user.currentChallenge;

	let dbAuthenticator: AuthenticatorDevice;
	const bodyCredIDBuffer = base64url.toBuffer(body.rawId);
	// "Query the DB" here for an authenticator matching `credentialID`
	for (const dev of user.devices) {
		if (dev.credentialID.equals(bodyCredIDBuffer)) {
			dbAuthenticator = dev;
			break;
		}
	}
	console.log("dbAuthenticator", dbAuthenticator!);

	if (!dbAuthenticator!) {
		return res
			.status(400)
			.send({ error: "Authenticator is not registered with this site" });
	}

	let verification: VerifiedAuthenticationResponse;
	try {
		const opts: VerifyAuthenticationResponseOpts = {
			credential: body,
			expectedChallenge: `${expectedChallenge}`,
			expectedOrigin,
			expectedRPID: rpID,
			authenticator: dbAuthenticator,
			requireUserVerification: true,
		};
		verification = await verifyAuthenticationResponse(opts);
	} catch (error) {
		const _error = error as Error;
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

// --- Store condition route
app.post("/store-condition", limiter, storeConditionHandler);

// --- Mint PKP routes
app.post("/mint/google", googleOAuthVerifyToMintHandler);
app.post("/mint/discord", discordOAuthVerifyToMintHandler);
app.post("/mint/wallet", walletVerifyToMintHandler);

app.post("/auth/webauthn", webAuthnAssertionVerifyToMintHandler);

// --- Fetch PKP routes
app.post("/auth/google", googleOAuthVerifyToFetchPKPsHandler);
app.post("/auth/discord", discordOAuthVerifyToFetchHandler);
app.post("/auth/wallet", walletVerifyToFetchHandler);

// --- Poll routes
app.get("/auth/status/:requestId", getAuthStatusHandler);

if (ENABLE_HTTPS) {
	const host = "0.0.0.0";
	const port = 443;
	expectedOrigin = `https://${rpID}`;

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
			console.log(
				`🚀 Server ready at ${expectedOrigin} (${host}:${port})`,
			);
		});
} else {
	const host = "127.0.0.1";
	const port = parseInt(PORT);
	expectedOrigin = `http://localhost:3000`;

	http.createServer(app).listen(port, () => {
		console.log(`🚀 Server ready at ${expectedOrigin} (${host}:${port})`);
	});
}
