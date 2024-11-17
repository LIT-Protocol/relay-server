import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../../lib/redisClient";

const limiter = rateLimit({
	// Redis store configuration
	store: new RedisStore({
		sendCommand: (...args: string[]) => redisClient.sendCommand(args),
	}),
	max: 1000, // Limit each IP to 1000 requests per `window`
	windowMs: 1000, // 1 second
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export default limiter;
