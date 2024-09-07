/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * An example Express server showing off a simple integration of @simplewebauthn/server.
 *
 * The webpages served from ./public use @simplewebauthn/browser.
 */

import './instrument';
import fs from "fs";
import http from "http";
import https from "https";

import base64url from "base64url";
import dotenv from "dotenv";
import express from "express";
import { Server as SocketIOServer } from 'socket.io';
// import {eventEmitter} from './eventEmitter';

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
import {
	otpVerifyToFetchPKPsHandler,
	otpVerifyToMintHandler,
} from "./routes/auth/otp";

import { mintClaimedKeyId } from "./routes/auth/claim";
import { registerPayerHandler } from "./routes/delegate/register";
import { addPayeeHandler } from "./routes/delegate/user";
// import redisClient from "./lib/redisClient";
import { failedTxWebHookHandler, thirdwebWebHookHandler } from "./routes/webhook/thirdweb";
import { getTxStatusByQueueId } from "./routes/thirdweb/transaction";
import { RoundRobin } from './utils/thirdweb/roundRobin';
import { backendWallets } from './utils/thirdweb/constants';



const app = express();
let server = http.createServer(app);

export const rr = new RoundRobin(backendWallets, config.env);
// Store eventEmitter in app.locals
// app.locals.eventEmitter = eventEmitter;

const { ENABLE_CONFORMANCE, ENABLE_HTTPS, RP_ID = "localhost" } = process.env;

app.use(express.static("./public/"));
app.use(express.json());
app.use(cors());

// export const io = new SocketIOServer(server, {
// 	cors: {
// 	  origin: "*", // Allow all origins, you can restrict this to your client's URL
// 	  methods: ["GET", "POST"]
// 	}
//   });
// io.on('connection', (socket) => {
//     console.log('New client connected');

//     // Store user identifier with the socket ID in Redis
//     socket.on('register', async (userId) => {
// 		try {
// 			await redisClient.hSet("userSocketMapping", userId, socket.id);
// 			console.log(`✅ User ${userId} connected with socket ID ${socket.id}`);
// 		}catch(err){
// 			console.error('❌ Error storing user ID in Redis:', err);
// 		}
//     });

// 	socket.on('disconnect', async () => {
//         try {
//             const keys = await redisClient.hKeys('userSocketMapping');
//             for (const key of keys) {
//                 const socketId = await redisClient.hGet("userSocketMapping", key);
//                 if (socketId === socket.id) {
//                    // await redisClient.hDel("userSocketMapping", key);
//                     console.log(`🔴 User ${key} disconnected`);
//                     break;
//                 }
//             }
//         } catch (err) {
//             console.error('❌ Error handling disconnection:', err);
//         }
//     });
// });

app.use(limiter);

// --- thirdweb webhook
app.post("/webhook", thirdwebWebHookHandler);
app.post("/failedTx-webhook", failedTxWebHookHandler);

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
		supportedAlgorithmIDs: [-7],
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

// -- (V2) Mint PKP for authorized account (using ThirdWeb)
app.post("/api/v2/mint-next-and-add-auth-methods", mintNextAndAddAuthMethodsHandler);

// --- Fetch PKPs tied to authorized account
app.post("/fetch-pkps-by-auth-method", fetchPKPsHandler);

// --- Poll minting progress
app.get("/auth/status/:requestId", getAuthStatusHandler);

// -- Payment Delegation
app.post("/register-payer", registerPayerHandler);
app.post("/add-users", addPayeeHandler);
app.post("/api/v2/add-users", addPayeeHandler);



// *** Deprecated ***

app.post("/auth/google", googleOAuthVerifyToMintHandler);
app.post("/auth/discord", discordOAuthVerifyToMintHandler);
app.post("/auth/wallet", walletVerifyToMintHandler);
app.post("/auth/otp", otpVerifyToMintHandler);
app.post("/auth/stytch-otp", stytchOtpVerifyToMintHandler);

app.post("/auth/google/userinfo", googleOAuthVerifyToFetchPKPsHandler);
app.post("/auth/discord/userinfo", discordOAuthVerifyToFetchPKPsHandler);
app.post("/auth/wallet/userinfo", walletVerifyToFetchPKPsHandler);
app.post("/auth/otp/userinfo", otpVerifyToFetchPKPsHandler);
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
app.get("/transaction/status/:queueId", getTxStatusByQueueId);

if (ENABLE_HTTPS) {
	const host = "0.0.0.0";
	const port = 443;

	server = https
		.createServer(
			{
				/**
				 * See the README on how to generate this SSL cert and key pair using mkcert
				 */
				key: fs.readFileSync(`./${rpID}.key`),
				cert: fs.readFileSync(`./${rpID}.crt`),
			},
			app,
		);
	server.listen(port, host, async () => {
		await rr.init();
		console.log(`🚀 1: Server ready at ${host}:${port}`);
	});
} else {
	const host = "127.0.0.1";
	const port = config.port;
	
	server.listen(port, async () => {
		await rr.init();
		console.log(`🚀 2: Server ready at ${host}:${port} 🌶️ NETWORK: ${process.env.NETWORK} | RPC: ${process.env.LIT_TXSENDER_RPC_URL} | ENV: ${config.env}`);
	});
}
