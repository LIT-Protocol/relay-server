import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../../lib/redisClient";

const limiter = rateLimit({
	// Redis store configuration
	store: new RedisStore({
		sendCommand: (...args: string[]) => redisClient.sendCommand(args),
	}),
	max: parseInt(process.env.RATE_LIMIT_MAX || "10"), // Configurable request limit
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "10000"), // Configurable window (default 10s)
	skip: (req) => {
		// Skip rate limiting for test and Vincent API keys
		const apiKey = req.header("api-key");
		return apiKey === process.env.LIT_VINCENT_RELAYER_API_KEY;
	},
});

export default limiter;
