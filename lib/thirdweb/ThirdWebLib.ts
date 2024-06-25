import { ethers } from "ethers";

// -- thirdweb config
const THIRDWEB_ENGINE_URL = process.env.THIRDWEB_ENGINE_URL;
const THIRDWEB_ACCESS_TOKEN = process.env.THIRDWEB_ACCESS_TOKEN;
const AUTH_HEADERS = {
	authorization: `Bearer ${THIRDWEB_ACCESS_TOKEN}`,
};

// -- chain config
const LIT_CHAIN_ID = 175177;
const LIT_SLUG = "lit-protocol";

export namespace ThirdWebLib {
	export namespace Fetch {
		/**
		 * Fetches data from the specified path using a GET request.
		 * @param path - The path to fetch data from.
		 * @returns A Promise that resolves to the fetched data.
		 */
		export async function get(path: string) {
			const res = await (
				await fetch(`${THIRDWEB_ENGINE_URL}${path}`, {
					headers: AUTH_HEADERS,
				})
			)
				.json()
				.catch((err) => {
					console.error("Error fetching chain:", err);
				});

			return res.result;
		}

		/**
		 * Fetches data from the server using the POST method.
		 *
		 * @param path - The path of the API endpoint.
		 * @param body - The request body.
		 * @param extraHeaders - Additional headers to be included in the request.
		 * @returns A Promise that resolves to the response data from the server.
		 */
		export async function post(path: string, body: any, extraHeaders = {}) {
			const res = await (
				await fetch(`${THIRDWEB_ENGINE_URL}${path}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...AUTH_HEADERS,
						...extraHeaders,
					},
					body: JSON.stringify(body),
				})
			)
				.json()
				.catch((err) => {
					console.error("Error fetching chain:", err);
				});

			return res;
		}
	}

	/**
	 * Action is an abstraction of using the ThirdWeb API endpoints.
	 */
	export namespace Action {
		/**
		 * Retrieves all wallets from the backend server.
		 * @returns A promise that resolves to an array of wallet objects.
		 * Each wallet object contains the address, type, and label (if available).
		 * @throws If there is an error fetching the wallets from the backend server.
		 */
		export async function getAllWallets(
			{
				limit,
			}: {
				limit: number;
			} = { limit: 1000 },
		): Promise<
			{
				address: string;
				type: "local";
				label: string | null;
			}[]
		> {
			try {
				const wallets = await Fetch.get(
					`/backend-wallet/get-all?page=1&limit=${limit}`,
				);
				return wallets;
			} catch (e: any) {
				throw new Error("[ThirdWebLib] Error fetching wallets:", e);
			}
		}

		/**
		 * Creates a wallet with the specified name.
		 * @param name - The name of the wallet.
		 * @returns A promise that resolves to an object containing the wallet address and status.
		 * @throws If there is an error creating the wallet.
		 */
		export async function createWallet(name: string): Promise<{
			walletAddress: string;
			status: "success" | "error";
		}> {
			try {
				const res = await ThirdWebLib.Fetch.post(
					"/backend-wallet/create",
					{
						label: name,
					},
				);

				return res.result;
			} catch (e: any) {
				throw new Error("[ThirdWebLib] Error creating wallet:", e);
			}
		}

		/**
		 * Retrieves the balance of a wallet address.
		 * @param address - The wallet address to retrieve the balance for.
		 * @returns A promise that resolves to an object containing the wallet address, name, symbol, decimals, value, and displayValue.
		 * @throws If there is an error retrieving the balance.
		 */
		export async function getBalance(address: string): Promise<{
			walletAddress: string;
			name: "LitProtocol";
			symbol: "LIT";
			decimals: 18;
			value: string;
			displayValue: string;
		}> {
			try {
				const balance = await Fetch.get(
					`/backend-wallet/${LIT_SLUG}/${address}/get-balance`,
				);
				return balance;
			} catch (e: any) {
				throw new Error("[ThirdWebLib] Error getting balance:", e);
			}
		}

		/**
		 * Funds a wallet by sending a transaction from one address to another.
		 * @param funder - The address of the funder.
		 * @param fundee - The address of the fundee.
		 * @param amount - The amount to be funded.
		 * @returns A promise that resolves to an object containing the queue ID of the transaction.
		 * @throws If there is an error while funding the wallet.
		 */
		export async function fundWallet({
			funder,
			fundee,
			amount,
		}: {
			funder: string;
			fundee: string;
			amount: string;
		}): Promise<{ queueId: string }> {
			try {
				const res = await ThirdWebLib.Fetch.post(
					`/backend-wallet/${LIT_SLUG}/send-transaction`,
					{
						toAddress: fundee,
						data: "0x",
						value: amount,
					},
					{
						"x-backend-wallet-address": funder,
					},
				);

				return {
					queueId: res.result.queueId,
				};
			} catch (e: any) {
				throw new Error("[ThirdWebLib] Error funding wallet:", e);
			}
		}

		/**
		 * Maintains balances of wallets by funding them if their balance is below a minimum threshold.
		 * @param {Object} options - The options for maintaining balances.
		 * @param {string} options.funderAddress - The address of the funder.
		 * @param {string} options.minimumBalance - The minimum balance threshold.
		 * @param {number} [options.maxWallets] - The maximum number of wallets to consider.
		 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of funding promises.
		 */
		export async function maintainBalances({
			minimumBalance,
			funderAddress,
			maxWallets,
		}: {
			funderAddress: string;
			minimumBalance: string;
			maxWallets?: number;
		}): Promise<{ queueId: string }[]> {
			const wallets = await ThirdWebLib.Action.getAllWallets({
				limit: maxWallets || 500,
			});

			// -- get all balances
			const balancePromises = wallets.map((wallet) => {
				return ThirdWebLib.Action.getBalance(wallet.address);
			});

			const balances = await Promise.all(balancePromises);

			// -- get all funding promises
			const fundPromises = balances.map((balance, i) => {
				const currentBalance = ethers.utils.parseEther(balance.value);
				const diff = ethers.utils
					.parseEther(minimumBalance)
					.sub(currentBalance);

				if (diff.gt(0)) {
					const diffInWei = diff.toString();

					return ThirdWebLib.Action.fundWallet({
						funder: funderAddress,
						fundee: balance.walletAddress,
						amount: diffInWei,
					});
				} else {
					console.log(
						`[${i}]: no need to fund ${balance.walletAddress}`,
					);
					return Promise.resolve({ queueId: "" });
				}
			});

			// queue all funding promises
			return await Promise.all(fundPromises);
		}

		export async function getAllTransactions() {
			try {
				const data = await Fetch.get(
					`/transaction/get-all?limit=10000`,
				);
				return data.transactions;
			} catch (e: any) {
				throw new Error(
					"[ThirdWebLib] Error fetching transactions:",
					e,
				);
			}
		}
	}

	export namespace Contract {

		export async function lit(){
			try{
				const res = await ThirdWebLib.Fetch.get(
					`/contract/${LIT_SLUG}`,
				);
				return res;
			}catch(e: any){
				throw new Error("[ThirdWebLib] Error reading contract:", e);
			}
		}

		export async function read({
			contractAddress,
			functionName,
		}: {
			contractAddress: string;
			functionName: string;
		}) {
			try {
				const res = await ThirdWebLib.Fetch.get(
					`/contract/${LIT_SLUG}/${contractAddress}/read?functionName=${functionName}`,
				);

				return res;
			} catch (e: any) {
				throw new Error("[ThirdWebLib] Error reading contract:", e);
			}
		}

		export async function write({
			contractAddress,
			functionName,
			args,
			backendWalletAddress,
			options,
		}: {
			contractAddress: string;
			functionName: string;
			args: any[];
			backendWalletAddress: string;
			options?: {
				simulateTx?: boolean;
			};
		}) {
			try {
				const res = await ThirdWebLib.Fetch.post(
					`/contract/${LIT_SLUG}/${contractAddress}/write?chain`,
					{
						functionName,
						args,
					},
					{
						"x-backend-wallet-address": backendWalletAddress,
					},
				);

				return res;
			} catch (e: any) {
				throw new Error("[ThirdWebLib] Error writing contract:", e);
			}
		}

	}
}