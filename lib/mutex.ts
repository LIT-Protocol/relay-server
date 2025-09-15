/**
 * Simple mutex implementation for serializing async operations
 */
export class Mutex {
    private _queue: (() => void)[] = [];
    private _locked = false;

    async acquire(): Promise<() => void> {
        return new Promise<() => void>((resolve) => {
            if (!this._locked) {
                this._locked = true;
                resolve(() => this.release());
            } else {
                this._queue.push(() => {
                    this._locked = true;
                    resolve(() => this.release());
                });
            }
        });
    }

    release(): void {
        if (this._queue.length > 0) {
            const next = this._queue.shift();
            if (next) {
                next();
            }
        } else {
            this._locked = false;
        }
    }
}

/**
 * Manages mutexes by key
 */
export class MutexManager {
    private static instance: MutexManager;
    private mutexes: Map<string, Mutex> = new Map();

    private constructor() {}

    public static getInstance(): MutexManager {
        if (!MutexManager.instance) {
            MutexManager.instance = new MutexManager();
        }
        return MutexManager.instance;
    }

    public getMutex(key: string): Mutex {
        const normalizedKey = key.toLowerCase();
        if (!this.mutexes.has(normalizedKey)) {
            this.mutexes.set(normalizedKey, new Mutex());
        }
        return this.mutexes.get(normalizedKey)!;
    }

    public clear(key?: string): void {
        if (key) {
            this.mutexes.delete(key.toLowerCase());
        } else {
            this.mutexes.clear();
        }
    }
}

export default MutexManager.getInstance();