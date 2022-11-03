import config from '../../config'

import * as redis from 'redis';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

let redisClient: any;

(async () => {
  redisClient = redis.createClient({
    url: config.redisUrl,
  });

  redisClient.on("error", (error: Error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();

const limiter = rateLimit({
    // Redis store configuration
    store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    max: 10, // Limit each IP to 10 requests per `window`
    windowMs: 10 * 1000 // 10s
});

export default limiter;
