import { utils } from "ethers";
import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { mintPKP } from "../../lit";
import {
	AuthMethodType,
	AuthMethodVerifyToMintResponse,
	WebAuthnAssertionVerifyToMintRequest,
} from "../../models";
import { verifySignature } from "../../utils/webAuthn/verifySignature";
import { decodeECKeyAndGetPublicKey } from "../../utils/webAuthn/keys";
import { toUtf8Bytes } from "ethers/lib/utils";

export async function webAuthnAssertionVerifyToMintHandler(
	req: Request<
		{},
		AuthMethodVerifyToMintResponse,
		WebAuthnAssertionVerifyToMintRequest,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<AuthMethodVerifyToMintResponse, Record<string, any>, number>,
) {
	// get parameters from body
	const { signature, signatureBase, credentialPublicKey } = req.body;

	// verify WebAuthn signature
	try {
		const signatureValid = await verifySignature({
			signature: Buffer.from(utils.arrayify(signature)),
			signatureBase: Buffer.from(utils.arrayify(signatureBase)),
			credentialPublicKey: Buffer.from(
				utils.arrayify(credentialPublicKey),
			),
		});

		if (!signatureValid) {
			return res.status(400).json({
				error: "Invalid signature",
			});
		}

		console.info("Signature valid", { credentialPublicKey });
	} catch (err) {
		console.error("Unable to verify signature", { err });
		return res.status(500).json({
			error: "Unable to verify signature",
		});
	}

	// mint PKP for user
	try {
		const decodedPublicKey = decodeECKeyAndGetPublicKey(
			Buffer.from(utils.arrayify(credentialPublicKey)),
		);
		console.log("Deriving ID for auth method", { decodedPublicKey });

		const idForAuthMethod = utils.keccak256(
			toUtf8Bytes(`0x${decodedPublicKey}:TODO:`),
		);
		const mintTx = await mintPKP({
			authMethodType: AuthMethodType.WebAuthn,
			idForAuthMethod,
		});
		return res.status(200).json({
			requestId: mintTx.hash,
		});
	} catch (err) {
		console.error("Unable to mint PKP for user", { err });
		return res.status(500).json({
			error: "Unable to mint PKP for user",
		});
	}
}
