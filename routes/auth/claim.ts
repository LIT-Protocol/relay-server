import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { AuthMethodType } from "../../models/index";
import {
	AuthMethodVerifyRegistrationResponse,
	Claim,
	ClaimAndMintResponse,
} from "../../models";
import { claimPKP } from "../../lit";

export async function mintClaimedKeyId(
	req: Request<
		{},
		AuthMethodVerifyRegistrationResponse,
		Claim,
		ParsedQs,
		Record<string, any>
	>,
	res: Response<
		AuthMethodVerifyRegistrationResponse,
		Record<string, any>,
		number
	>,
) {
	const { derivedKeyId, authMethodType, signatures } = req.body;
	try {
		let mintTx = await claimPKP({
			keyId: derivedKeyId,
			signatures,
			authMethodType,
			authMethodId: derivedKeyId,
			authMethodPubkey: "0x",
		});
		console.info("claimed key id: transaction hash (request id): ", {
			requestId: mintTx.
		});
		return res.status(200).json({
			requestId: mintTx.hash
		});
	} catch (e) {
		console.error("Unable to claim key with key id: ", derivedKeyId, e);
		return res.status(500).json({
			error: `Unable to claim key with derived id: ${derivedKeyId}`,
		});
	}
}
