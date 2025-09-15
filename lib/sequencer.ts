import { Wallet, providers } from "ethers";
import crypto from "crypto";
export type Action = {
	//TODO: Support arbitrary param count.
	action: (params: any[]) => Promise<any>;
	params: any[];
	transactionData: Record<string, any>;
};

export type ActionWrapper = {
	action: Action;
	id: string;
	resolve: any;
	reject: any;
};

export class SequencerError extends Error {
	private _id: string;
	constructor(message: string, id: string) {
		super(message);
		this._id = id;
	}

	get Id(): string {
		return this._id;
	}

	public override toString(): string {
		return `
			Message: ${this.message}
			Name: ${this.name}
			Id: ${this._id}
			Stack: ${this.stack}
		`;
	}
}

export class Sequencer {
	private static _instance: Sequencer;
	private static _wallet: Wallet | providers.JsonRpcProvider;

	private _queue: ActionWrapper[] = [];
	private _running: boolean = false;
	private _waitTime: number = process.env.CHAIN_POLLING_INTERVAL_MS
		? parseInt(process.env.CHAIN_POLLING_INTERVAL_MS, 10)
		: 200;
	private _nonce: number = -1;
	private _lastChainNonce: number = -1;
	private _nonceLastUpdated: number = 0;
	private _pollingPromise: Promise<void> | undefined;
	private _actionIndex: Record<string, Promise<any>> = {};
	private _instanceWallet: Wallet | providers.JsonRpcProvider | undefined;

	static get Instance(): Sequencer {
		if (!Sequencer._instance) Sequencer._instance = new Sequencer();

		return Sequencer._instance;
	}

	static set Wallet(value: Wallet | providers.JsonRpcProvider) {
		Sequencer._wallet = value;
	}

	set wallet(value: Wallet | providers.JsonRpcProvider) {
		this._instanceWallet = value;
	}

	constructor() {}

	public wait(item: Action): Promise<any> {
		let rlv;
		let rjct;
		let prms = new Promise<any>(async (resolve, reject) => {
			rlv = resolve;
			rjct = reject;
		});
		let id = this._uuidv4();
		this._queue.push({
			action: item,
			id,
			resolve: rlv,
			reject: rjct,
		});

		this._actionIndex[id] = prms;

		if (!this._running) this.start();

		return prms;
	}

	public async start(): Promise<void> {
		this._running = true;
		this._doStartQueueListener();
	}

	public async stop() {
		this._running = false;
		this._pollingPromise = undefined;
	}

	private _doStartQueueListener(): Promise<void> {
		this._pollingPromise = new Promise<void>(async (resolve, reject) => {
			while (this._running) {
				if (this._queue.length < 1) {
					await new Promise<void>((resolve, reject) => {
						setTimeout(() => resolve(), this._waitTime);
					});
					continue;
				}
				// shift cannot return null with the above check
				const next: ActionWrapper =
					this._queue.shift() as ActionWrapper;
				try {
					const wallet = this._instanceWallet || Sequencer._wallet;
					if (!wallet) {
						throw new Error('No wallet set for sequencer');
					}
					
					let nonce = await this._getOptimisticNonce(wallet);
					// console.log("Nonce for tx: ", nonce);
					let params = next.action.params;
					let transactionData = next.action.transactionData
						? next.action.transactionData
						: {};
					transactionData["nonce"] = nonce;
					params.push(transactionData);
					// console.log("params going to fn", params);
					let res = await next.action.action.apply(
						this,
						params as any,
					);
					
					// Wait for transaction confirmation in sequencer
					if (res && res.wait) {
						try {
							await res.wait();
							console.log(`Transaction ${res.hash} confirmed`);
						} catch (waitError) {
							console.error(`Transaction ${res.hash} failed to confirm:`, waitError);
							// Don't throw here - the transaction was submitted successfully
						}
					}
					
					// Increment optimistic nonce for next transaction
					this._nonce = nonce + 1;
					
					next.resolve(res);
					delete this._actionIndex[next.id];
				} catch (e) {
					const errorMessage = (e as Error).message;
					
					// Check if it's a nonce error and try to recover
					if (this._isNonceError(errorMessage)) {
						console.warn("[Sequencer] Nonce error detected, refreshing from chain:", errorMessage);
						this._nonce = -1; // Force refresh from chain
						this._lastChainNonce = -1;
						// Re-queue this action to try again
						this._queue.unshift(next);
						continue;
					}
					
					e = new SequencerError(errorMessage, next.id);
					console.error(
						"[Sequencer] error while executing queued action",
						(e as SequencerError).toString(),
					);
					this._flush(e as Error);
					this._nonce = -1;
					this._lastChainNonce = -1;
				}
			}
		});

		return this._pollingPromise;
	}

	private _uuidv4() {
		//@ts-ignore
		return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
			(
				crypto.webcrypto.getRandomValues(new Uint8Array(1))[0] &
				(15 >> (c / 4))
			).toString(16),
		);
	}

	private _flush(e: Error): void {
		while (this._queue.length > 0) {
			const action = this._queue.pop();
			action?.reject(e);
		}
		this._pollingPromise = undefined;
	}

	private async _getOptimisticNonce(wallet: Wallet | providers.JsonRpcProvider): Promise<number> {
		const now = Date.now();
		const NONCE_CACHE_MS = 5000; // Cache nonce for 5 seconds
		
		// If we have no cached nonce or it's stale, fetch from chain
		if (this._nonce === -1 || (now - this._nonceLastUpdated) > NONCE_CACHE_MS) {
			try {
				//@ts-ignore
				const chainNonce = await wallet.getTransactionCount();
				console.log(`[Sequencer] Fetched nonce from chain: ${chainNonce}`);
				
				// Use the higher of chain nonce or our optimistic nonce
				this._nonce = Math.max(chainNonce, this._nonce === -1 ? chainNonce : this._nonce);
				this._lastChainNonce = chainNonce;
				this._nonceLastUpdated = now;
				
				return this._nonce;
			} catch (error) {
				console.error('[Sequencer] Failed to fetch nonce from chain:', error);
				if (this._nonce === -1) {
					throw error;
				}
				// Fall back to optimistic nonce if we have one
				return this._nonce;
			}
		}
		
		// Return optimistic nonce (incremented locally)
		return this._nonce;
	}

	private _isNonceError(errorMessage: string): boolean {
		const nonceErrorPatterns = [
			'nonce too low',
			'nonce too high', 
			'replacement fee too low',
			'already known',
			'invalid nonce'
		];
		
		const lowerError = errorMessage.toLowerCase();
		return nonceErrorPatterns.some(pattern => lowerError.includes(pattern));
	}
}
