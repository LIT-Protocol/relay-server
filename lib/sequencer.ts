import { Wallet, providers } from "ethers";

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

export class Sequencer {
	private static _instance: Sequencer;
	private static _wallet: Wallet | providers.JsonRpcProvider;

	private _queue: ActionWrapper[] = [];
	private _running: boolean = false;
	private _waitTime: number = process.env.CHAIN_POLLING_INTERVAL_MS
		? parseInt(process.env.CHAIN_POLLING_INTERVAL_MS, 10)
		: 5_000;

	private _pollingPromise: Promise<void> | undefined;

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

		this._queue.push({
			action: item,
			id: this._uuidv4(),
			resolve: rlv,
			reject: rjct,
		});

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
					//@ts-ignore
					let nonce = await Sequencer._wallet.getTransactionCount();
					console.log("Nonce for tx: ", nonce);
					let params = next.action.params;
					let transactionData = next.action.transactionData
						? next.action.transactionData
						: {};
					transactionData["nonce"] = nonce;
					params.push(transactionData);
					let res = await next.action.action
						.apply(this, params as any)
						.catch((e) => {
							console.error(
								"[Sequencer] error while executing queued action",
							);
						});
					next.resolve(res);
				} catch (e) {
					console.error(e);
					this._flush();
				}
				// Sleep for 2 seconds to space contract calls
				await new Promise<void>((resolve, reject) => {
					setTimeout(() => resolve(), this._waitTime);
				});
			}
		});

		return this._pollingPromise;
	}

	private _uuidv4() {
		//@ts-ignore
		return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
			(
				crypto.getRandomValues(new Uint8Array(1))[0] &
				(15 >> (c / 4))
			).toString(16),
		);
	}

	private _flush(): void {
		while (this._queue.length > 0) {
			const action = this._queue.pop();
			action?.reject();
		}
	}
}
