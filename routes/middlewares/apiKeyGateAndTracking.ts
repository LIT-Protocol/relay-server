import { NextFunction, Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import redisClient from "../../lib/redisClient";

const API_KEY_HEADER_KEY = "api-key";

export default function apiKeyGateAndTracking(
	req: Request<{}, any, any, ParsedQs, Record<string, any>>,
	res: Response<any, Record<string, any>, number>,
	next: NextFunction,
) {
	const apiKey = req.header(API_KEY_HEADER_KEY);

	if (!apiKey) {
		return res.status(400).json({
			error: "Missing API key. If you do not have one, please request one at https://forms.gle/osJfmRR2PuZ46Xf98",
		});
	}

	// increment tracking
	const now = new Date();
	const trackingKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}:${apiKey}`;
	redisClient.incr(trackingKey);

	next();
}
