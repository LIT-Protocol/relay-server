import {Mutex} from "async-mutex";

export class RoundRobin {
    addresses: string[];
    index: number;
    mutex: Mutex;
    constructor(addresses: string[]) {
        this.addresses = addresses;
        this.index = 0;
        this.mutex = new Mutex();
    }

    async next() {
        const release = await this.mutex.acquire();
        try {
            const address = this.addresses[this.index];
            this.index = (this.index + 1) % this.addresses.length;
            return address;
        } finally {
            release();
        }
    }
}