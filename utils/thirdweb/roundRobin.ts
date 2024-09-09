import { Mutex } from "async-mutex";
import redisClient from "../../lib/redisClient";

export class RoundRobin {
    addresses: string[];
    index: number;
    mutex: Mutex;
    environment: string;

    constructor(addresses: string[], environment: string) {
        this.addresses = addresses;
        this.index = environment === "production" ? 0 : 500;
        this.mutex = new Mutex();
        this.environment = environment;
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
        const release = await this.mutex.acquire();
        try {
            const address = this.addresses[this.index]; // Using modulo to wrap around addresses array
            // Adjust index bounds based on environment
            if (this.environment === "production") {
                // 500 wallets for production index 0 to 499
                this.index = this.index < 499 ? this.index + 1 : 0;
            } else if (this.environment === "staging") {
                // 499 wallets for staging/loadtesting index 500 to 998
                this.index = this.index < 998 ? this.index + 1 : 500;
            }
            console.log(`🛑🛑 ${this.environment} index`, this.index);
            await redisClient.set(`${this.environment}_rr_pointer`, this.index.toString());
            return address;
        } finally {
            release();
        }
    }
}
