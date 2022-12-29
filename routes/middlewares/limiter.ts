import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../../lib/redisClient";

const limiter = rateLimit({
	// Redis store configuration
	store: new RedisStore({
		sendCommand: (...args: string[]) => redisClient.sendCommand(args),
	}),
	max: 10, // Limit each IP to 10 requests per `window`
	windowMs: 10 * 1000, // 10s
});

export default limiter;
