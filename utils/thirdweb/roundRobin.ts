import { Mutex } from "async-mutex";
import redisClient from "../../lib/redisClient";

export class RoundRobin {
    addresses: string[];
    index: number;
    mutex: Mutex;
    environment: string;

    constructor(addresses: string[], environment: string) {
        this.addresses = addresses;
        this.index = environment === "production" ? 1 : 501;
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
            const address = this.addresses[this.index % this.addresses.length]; // Using modulo to wrap around addresses array
            // Adjust index bounds based on environment
            if (this.environment === "production") {
                this.index = this.index < 500 ? this.index + 1 : 1;
            } else if (this.environment === "staging") {
                this.index = this.index < 1000 ? this.index + 1 : 501;
            }
            console.log(`🛑🛑 ${this.environment} index`, this.index);
            await redisClient.set(`${this.environment}_rr_pointer`, this.index.toString());
            return address;
        } finally {
            release();
        }
    }
}
