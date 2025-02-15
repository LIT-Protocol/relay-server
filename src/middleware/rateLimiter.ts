import { rateLimit } from "elysia-rate-limit";
import { env } from "config/env";

export const rateLimiter = rateLimit({
  max: Number(env.MAX_REQUESTS_PER_WINDOW),
  duration: Number(env.WINDOW_MS),
  errorResponse: "Rate limit exceeded",
});
