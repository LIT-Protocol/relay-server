// npx ts-node scripts/load_pkp_public_keys.ts

import * as redis from "redis";

const redisUrl = "redis://localhost:6379";
const pkpPulicKeysToLoad = [
	"0x04dac190a57c766e9fc8adedeb6fd7099311e53681bfbbc7e7fd54d8db3117bd154b1ad82ea9cf6df3d628a1104de40c7d0c8726f0f4f7442c00515b7e4d8ee293",
	"0x04ad292313ee26f675a63ef711c52aeaeb8287597ef0f418c27ba433554771d9a071169b6a69badb4a1ee63cbd628222812d0ea303a572797e6342658ac130cdb7",
	"0x0438b3f1bd373252f79024892fd4404b9409fa88e849b054083adf84e3363242c930ca3259c10ba04b0ba8f185048bd2cceeef1e36a6ecc8d4f46ce9aa02a9b722",
];

let redisClient: redis.RedisClientType;

(async () => {
	redisClient = redis.createClient({
		url: redisUrl,
	});

	redisClient.on("error", (error: Error) =>
		console.error(`Error : ${error}`),
	);

	await redisClient.connect();
})();

async function run() {
	for (const key of pkpPulicKeysToLoad) {
		// Set the score to 0 so that the PKP is marked as unminted.
		await redisClient.zAdd("pkp_public_keys", {
			score: 0,
			value: key,
		});
	}

	console.info("Done");

	process.exit(0);
}

run();
