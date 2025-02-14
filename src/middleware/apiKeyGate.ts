import { NextFunction, Request, Response } from "express";
import { redisClient } from "../lib/redis";

const API_KEY_HEADER = "api-key";

export function apiKeyGateAndTracking(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.header(API_KEY_HEADER);

  if (!apiKey) {
    return res.status(400).json({
      error: "Missing API key. If you do not have one, please request one at https://forms.gle/osJfmRR2PuZ46Xf98",
    });
  }

  // Track API usage
  const now = new Date();
  const trackingKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}:${apiKey}`;
  redisClient.incr(trackingKey);

  next();
} 