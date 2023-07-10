import config from "../config";

import * as redis from "redis";

let redisClient: redis.RedisClientType;

(async () => {
	redisClient = redis.createClient({
		url: config.redisUrl,
	});

	redisClient.on("error", (error: Error) =>
		console.error(`Error : ${error}`),
	);

	const redisClientConnected = await redisClient.connect();
	console.log(`Redis client connected: ${redisClientConnected}`);
})();

export default redisClient!;
