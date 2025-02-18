import { Elysia } from "elysia";
import { env } from "config/env";
import { redisClient } from "../services/redis/redis";

export const apiKeyGateAndTracking = new Elysia().onRequest(
  async ({ request, set }) => {
    if (!env.ENABLE_API_KEY_GATE) {
      return;
    }

    if (
      request.url.includes("/index.html") ||
      request.url.includes("/admin.html") ||
      request.url.includes("/request-key") ||
      request.url.includes("/swagger")
    ) {
      return;
    }

    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      set.status = 401;
      return new Response(
        JSON.stringify({
          error:
            "Missing API key. If you do not have one, please request one at https://forms.gle/osJfmRR2PuZ46Xf98",
        }),
        {
          headers: { "content-type": "application/json" },
          status: 401,
        }
      );
    }

    // Track API usage by date
    const now = new Date();
    const trackingKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}:${apiKey}`;
    await redisClient.incr(trackingKey);
  }
);
