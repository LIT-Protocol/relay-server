import { ethers } from "ethers";
import * as Sentry from "@sentry/node";

/**
 * Manages optimistic nonce assignment for parallel transactions
 * Each transaction gets a unique nonce immediately, with automatic retry on conflicts
 */
export class OptimisticNonceManager {
	private static instances: Map<string, OptimisticNonceManager> = new Map();

	private baseNonce: number = -1;
	private nextNonce: number = -1;
	private lastChainUpdate: number = 0;
	private pendingTransactions = new Set<number>();
	private readonly CACHE_TTL = 3000; // 3 seconds (shorter for high concurrency)
	private refreshPromise: Promise<void> | null = null; // Prevent concurrent refreshes

	private constructor(private walletAddress: string) {}

	public static getInstance(walletAddress: string): OptimisticNonceManager {
		const normalizedAddress = walletAddress.toLowerCase();
		if (!this.instances.has(normalizedAddress)) {
			this.instances.set(
				normalizedAddress,
				new OptimisticNonceManager(normalizedAddress),
			);
		}
		return this.instances.get(normalizedAddress)!;
	}

	/**
	 * Get next available nonce immediately (optimistic)
	 */
	public async getNextNonce(wallet: ethers.Wallet): Promise<number> {
		await this.refreshNonceIfNeeded(wallet);

		const assignedNonce = this.nextNonce;
		this.nextNonce++; // Increment for next request
		this.pendingTransactions.add(assignedNonce);

		console.log(
			`[NonceManager] Assigned optimistic nonce ${assignedNonce} to transaction (${this.pendingTransactions.size} pending), next will be ${this.nextNonce}`,
		);
		return assignedNonce;
	}

	/**
	 * Mark a transaction as completed (success or permanent failure)
	 */
	public markTransactionComplete(
		nonce: number,
		success: boolean = true,
	): void {
		this.pendingTransactions.delete(nonce);
		console.log(
			`[NonceManager] Transaction with nonce ${nonce} ${
				success ? "completed" : "failed"
			} (${this.pendingTransactions.size} pending)`,
		);
	}

	/**
	 * Force refresh nonce from chain (for error recovery)
	 */
	public async forceRefreshNonce(wallet: ethers.Wallet): Promise<void> {
		console.log(
			`[NonceManager] Force refreshing nonce for ${this.walletAddress}`,
		);
		this.lastChainUpdate = 0; // Force refresh
		this.refreshPromise = null; // Clear any existing refresh promise
		await this.refreshNonceIfNeeded(wallet);
	}

	private async refreshNonceIfNeeded(wallet: ethers.Wallet): Promise<void> {
		const now = Date.now();
		const isStale = now - this.lastChainUpdate > this.CACHE_TTL;
		const needsInit = this.baseNonce === -1;

		// Always refresh if we don't have a nonce, or if cache is stale
		if (needsInit || isStale) {
			// If there's already a refresh in progress, wait for it
			if (this.refreshPromise) {
				console.log(
					`[NonceManager] Waiting for existing refresh to complete...`,
				);
				await this.refreshPromise;
				return;
			}

			console.log(
				`[NonceManager] Refreshing nonce (init: ${needsInit}, stale: ${isStale}, age: ${
					now - this.lastChainUpdate
				}ms)`,
			);

			// Start a new refresh
			this.refreshPromise = this.doRefreshNonce(wallet, now);
			try {
				await this.refreshPromise;
			} finally {
				this.refreshPromise = null;
			}
		}
	}

	private async doRefreshNonce(
		wallet: ethers.Wallet,
		timestamp: number,
	): Promise<void> {
		try {
			const chainNonce = await wallet.getTransactionCount("pending");
			console.log(
				`[NonceManager] Chain nonce for ${this.walletAddress}: ${chainNonce} (current base: ${this.baseNonce}, next: ${this.nextNonce})`,
			);

			// More intelligent nonce management:
			// - If chain nonce is higher than our next nonce, some transactions completed, reset to chain
			// - If chain nonce is lower, we have pending transactions, keep our optimistic nonce
			// - Only reset completely if we're way off (drift > 10)

			if (this.baseNonce === -1) {
				// First time initialization
				this.baseNonce = chainNonce;
				this.nextNonce = chainNonce;
				console.log(
					`[NonceManager] Initial nonce set to: ${chainNonce}`,
				);
			} else if (chainNonce > this.nextNonce) {
				// Chain has moved forward, some of our transactions completed
				this.baseNonce = chainNonce;
				this.nextNonce = chainNonce;
				console.log(
					`[NonceManager] Chain moved forward, reset to: ${chainNonce}`,
				);
			} else if (Math.abs(chainNonce - this.nextNonce) > 10) {
				// We've drifted too far, reset conservatively
				console.warn(
					`[NonceManager] Large nonce drift detected (chain: ${chainNonce}, ours: ${this.nextNonce}), resetting`,
				);
				this.baseNonce = chainNonce;
				this.nextNonce = chainNonce;
			} else {
				// Keep our optimistic nonce, just update base for reference
				this.baseNonce = chainNonce;
				console.log(
					`[NonceManager] Keeping optimistic nonce ${this.nextNonce} (chain: ${chainNonce}, pending: ${this.pendingTransactions.size})`,
				);
			}

			this.lastChainUpdate = timestamp;
		} catch (error) {
			console.error(
				`[NonceManager] Failed to fetch nonce from chain:`,
				error,
			);
			// If we don't have any nonce yet, this is a fatal error
			if (this.baseNonce === -1) {
				throw error;
			}
			// Otherwise, continue with optimistic nonce but mark refresh as failed
			console.warn(
				`[NonceManager] Continuing with cached nonce ${this.nextNonce} due to RPC error`,
			);
		}
	}

	/**
	 * Check if a nonce error indicates we should retry
	 */
	public static isRetryableNonceError(error: string): boolean {
		const retryablePatterns = [
			"nonce too low",
			"nonce too high",
			"replacement fee too low",
			"already known",
			"invalid nonce",
			"nonce has already been used",
		];

		const lowerError = error.toLowerCase();
		return retryablePatterns.some((pattern) =>
			lowerError.includes(pattern),
		);
	}
}

/**
 * Execute a transaction with automatic nonce management and retry logic
 */
export async function executeTransactionWithRetry(
	wallet: ethers.Wallet,
	transactionFunction: (
		nonce: number,
	) => Promise<ethers.providers.TransactionResponse>,
	maxRetries: number = 15, // Further increased for high concurrency
): Promise<ethers.providers.TransactionResponse> {
	const nonceManager = OptimisticNonceManager.getInstance(wallet.address);
	let lastError: Error | null = null;
	let consecutiveNonceErrors = 0;
	const isTestEnvironment =
		process.env.NODE_ENV === "test" ||
		process.env.JEST_WORKER_ID !== undefined;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const nonce = await nonceManager.getNextNonce(wallet);
			console.log(
				`[TransactionRetry] Attempt ${
					attempt + 1
				}/${maxRetries} with nonce ${nonce}`,
			);

			const tx = await transactionFunction(nonce);

			// Transaction submitted successfully
			console.log(
				`[TransactionRetry] Transaction submitted: ${tx.hash} (nonce: ${nonce})`,
			);

			// Start confirmation tracking in background with comprehensive error handling
			// This promise is intentionally not awaited to allow immediate return
			const backgroundConfirmation = tx
				.wait()
				.then((receipt) => {
					nonceManager.markTransactionComplete(nonce, true);
					if (!isTestEnvironment) {
						console.log(
							`[TransactionRetry] Transaction ${tx.hash} confirmed in block ${receipt.blockNumber}`,
						);
					}
					return receipt;
				})
				.catch((error) => {
					// Always mark transaction as complete to free up nonce tracking
					nonceManager.markTransactionComplete(nonce, false);

					if (!isTestEnvironment) {
						// Log error but don't throw - this is a background task
						console.error(
							`[TransactionRetry] Transaction ${tx.hash} failed to confirm:`,
							error,
						);

						// Report significant failures to Sentry (not network hiccups)
						if (
							error?.code === "TRANSACTION_REPLACED" ||
							error?.code === "TIMEOUT"
						) {
							// These are expected in some cases, just log
							console.warn(
								`[TransactionRetry] Transaction ${tx.hash} was replaced or timed out`,
							);
						} else if (error?.receipt?.status === 0) {
							// Transaction was mined but reverted - this is important
							Sentry.captureException(
								new Error(
									`Transaction ${tx.hash} reverted on chain`,
								),
								{
									extra: {
										txHash: tx.hash,
										nonce,
										error: error.message,
										receipt: error.receipt,
									},
									tags: {
										component: "optimisticNonceManager",
										failure_type: "transaction_reverted",
									},
								},
							);
						}
					}

					// Return null to indicate failure, but don't throw
					return null;
				});

			return tx;
		} catch (error) {
			const errorMessage = (error as Error).message;
			lastError = error as Error;

			console.error(
				`[TransactionRetry] Attempt ${attempt + 1} failed:`,
				errorMessage,
			);

			// If it's a nonce error, refresh and retry with backoff
			if (OptimisticNonceManager.isRetryableNonceError(errorMessage)) {
				consecutiveNonceErrors++;
				console.log(
					`[TransactionRetry] Nonce error detected (${consecutiveNonceErrors} consecutive), refreshing and retrying...`,
				);

				// Force refresh nonce from chain
				await nonceManager.forceRefreshNonce(wallet);

				// More aggressive backoff for consecutive nonce errors
				let baseDelay = 50;
				if (consecutiveNonceErrors > 3) {
					baseDelay = 200; // Slower retry after multiple nonce errors
				}

				const maxDelay = 3000; // Increased max delay
				const delay = Math.min(
					baseDelay * Math.pow(1.5, attempt),
					maxDelay,
				); // Gentler exponential
				const jitter = Math.random() * 0.4; // Increased jitter
				const finalDelay = delay * (1 + jitter);

				console.log(
					`[TransactionRetry] Waiting ${finalDelay.toFixed(
						0,
					)}ms before retry ${attempt + 2}`,
				);
				await new Promise((resolve) => setTimeout(resolve, finalDelay));

				continue;
			} else {
				// Reset consecutive nonce error counter for non-nonce errors
				consecutiveNonceErrors = 0;

				// For non-nonce errors, don't retry immediately
				throw error;
			}
		}
	}

	const finalError = new Error(
		`Transaction failed after ${maxRetries} attempts. Last error: ${lastError?.message}`,
	);

	// Report to Sentry when we've exhausted all retries
	Sentry.captureException(finalError, {
		extra: {
			walletAddress: wallet.address,
			maxRetries,
			lastError: lastError?.message,
			consecutiveNonceErrors,
		},
		tags: {
			component: "optimisticNonceManager",
			failure_type: "exhausted_retries",
		},
	});

	throw finalError;
}
