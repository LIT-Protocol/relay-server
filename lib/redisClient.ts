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

	await redisClient.connect();
})();

export default redisClient!;
