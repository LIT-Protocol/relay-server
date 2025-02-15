import { Elysia } from "elysia";
import { env } from "config/env";
import { redisClient } from "../services/redis/redis";

export const apiKeyGateAndTracking = new Elysia().derive(
  async ({ request, set }) => {
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      set.status = 401;
      throw new Error(
        "Missing API key. If you do not have one, please request one at https://forms.gle/osJfmRR2PuZ46Xf98"
      );
    }

    // Track API usage by date
    const now = new Date();
    const trackingKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}:${apiKey}`;
    await redisClient.incr(trackingKey);

    return {};
  }
);
