import redisClient from "../../lib/redisClient";

export class TempRoundRobin {
    addresses: string[];
    index: number;
    environment: string;

    constructor(addresses: string[], environment: string) {
        this.addresses = addresses;
        this.environment = environment;
        this.index = environment === "production" ? 0 : 500;
    }

    async init() {
        const rr_pointer = await redisClient.get(`${this.environment}_rr_pointer`);
        if (rr_pointer) {
            this.index = parseInt(rr_pointer);
        } else {
            await redisClient.set(`${this.environment}_rr_pointer`, this.index.toString());
        }
    }

    async next() {
        const rr_pointer_key = `${this.environment}_rr_pointer`;
        const lock_key = `${rr_pointer_key}_lock`;

        let address;

        // Try to acquire the Redis lock with retries and backoff in case of high contention
        const maxRetries = 5;
        const retryDelay = 100; // 100ms initial delay

        let locked = await this.tryAcquireLock(lock_key, 10000, maxRetries, retryDelay);  // 10s lock expiration

        if (!locked) {
            throw new Error("Could not acquire lock for round robin pointer after retries.");
        }

        try {
            const rr_pointer = await redisClient.incr(rr_pointer_key);

            if (this.environment === "production") {
                // Wrap around between 0 and 499 for production
                this.index = rr_pointer % 500;
            } else if (this.environment === "staging") {
                // Wrap around between 500 and 999 for staging
                this.index = (rr_pointer % 500) + 500;
            }

            address = this.addresses[this.index];

            console.log(`🛑🛑 ${this.environment} index`, this.index);
            return address;
        } finally {
            await this.releaseLock(lock_key); // Release the Redis lock
        }
    }

    async tryAcquireLock(lockKey: string, ttl: number, maxRetries: number, delay: number) {
        let retries = 0;
        let locked = false;
        while (retries < maxRetries) {
            const result = await redisClient.set(lockKey, "locked", {
                NX: true,
                PX: ttl
              });
              if (result === "OK") {
                locked = true;
                break;
              }
              
            retries++;
            await this.sleep(retries * delay); // Exponential backoff
        }
        return locked;
    }

    async releaseLock(lockKey: string) {
        await redisClient.del(lockKey);
    }

    sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
