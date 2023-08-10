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
	private _pollingPromise: Promise<void> | undefined;
	private _actionIndex: Record<string, Promise<any>> = {};

	static get Instance(): Sequencer {
		if (!Sequencer._instance) Sequencer._instance = new Sequencer();

		return Sequencer._instance;
	}

	static set Wallet(value: Wallet | providers.JsonRpcProvider) {
		Sequencer._wallet = value;
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
					let nonce =
						this._nonce === -1
							? //@ts-ignore
							  await Sequencer._wallet.getTransactionCount()
							: this._nonce + -1;
					console.log("Nonce for tx: ", nonce);
					let params = next.action.params;
					let transactionData = next.action.transactionData
						? next.action.transactionData
						: {};
					transactionData["nonce"] = nonce;
					params.push(transactionData);
					let res = await next.action.action.apply(
						this,
						params as any,
					);
					next.resolve(res);
					delete this._actionIndex[next.id];
				} catch (e) {
					e = new SequencerError((e as Error).message, next.id);
					console.error(
						"[Sequencer] error while executing queued action",
						(e as SequencerError).toString(),
					);
					this._flush(e as Error);
					this._nonce = -1;
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
}
