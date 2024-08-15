import {Mutex} from "async-mutex";
import redisClient from "../../lib/redisClient";

export class RoundRobin {
    addresses: string[];
    index: number;
    mutex: Mutex;
    constructor(addresses: string[]) {
        this.addresses = addresses;
        this.index = 0;
        this.mutex = new Mutex();
    }
    async init () {
        const rr_pointer = await redisClient.get(`production_rr_pointer`);
        if (rr_pointer) {
            this.index = parseInt(rr_pointer);
        }else{
            await redisClient.set(`production_rr_pointer`, this.index.toString());
        }
    }
    async next() {
        const release = await this.mutex.acquire();
        try {
            const address = this.addresses[this.index];
            this.index = (this.index + 1) % this.addresses.length;
            console.log("🛑🛑 this.index", this.index);
            await redisClient.set(`production_rr_pointer`, this.index.toString());
            return address;
        } finally {
            release();
        }
    }
}