import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../lib/redis";
import { env } from "config/env";

export const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  max: Number(env.MAX_REQUESTS_PER_WINDOW),
  windowMs: Number(env.WINDOW_MS),
});
