import { ethers } from 'ethers';

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
            this.instances.set(normalizedAddress, new OptimisticNonceManager(normalizedAddress));
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
        
        console.log(`[NonceManager] Assigned optimistic nonce ${assignedNonce} to transaction (${this.pendingTransactions.size} pending), next will be ${this.nextNonce}`);
        return assignedNonce;
    }
    
    /**
     * Mark a transaction as completed (success or permanent failure)
     */
    public markTransactionComplete(nonce: number, success: boolean = true): void {
        this.pendingTransactions.delete(nonce);
        console.log(`[NonceManager] Transaction with nonce ${nonce} ${success ? 'completed' : 'failed'} (${this.pendingTransactions.size} pending)`);
    }
    
    /**
     * Force refresh nonce from chain (for error recovery)
     */
    public async forceRefreshNonce(wallet: ethers.Wallet): Promise<void> {
        console.log(`[NonceManager] Force refreshing nonce for ${this.walletAddress}`);
        this.lastChainUpdate = 0; // Force refresh
        this.refreshPromise = null; // Clear any existing refresh promise
        await this.refreshNonceIfNeeded(wallet);
    }
    
    private async refreshNonceIfNeeded(wallet: ethers.Wallet): Promise<void> {
        const now = Date.now();
        const isStale = (now - this.lastChainUpdate) > this.CACHE_TTL;
        const needsInit = this.baseNonce === -1;
        
        // Always refresh if we don't have a nonce, or if cache is stale
        if (needsInit || isStale) {
            // If there's already a refresh in progress, wait for it
            if (this.refreshPromise) {
                console.log(`[NonceManager] Waiting for existing refresh to complete...`);
                await this.refreshPromise;
                return;
            }
            
            console.log(`[NonceManager] Refreshing nonce (init: ${needsInit}, stale: ${isStale}, age: ${now - this.lastChainUpdate}ms)`);
            
            // Start a new refresh
            this.refreshPromise = this.doRefreshNonce(wallet, now);
            try {
                await this.refreshPromise;
            } finally {
                this.refreshPromise = null;
            }
        }
    }
    
    private async doRefreshNonce(wallet: ethers.Wallet, timestamp: number): Promise<void> {
        try {
            const chainNonce = await wallet.getTransactionCount('pending');
            console.log(`[NonceManager] Chain nonce for ${this.walletAddress}: ${chainNonce} (current base: ${this.baseNonce}, next: ${this.nextNonce})`);
            
            // Always reset to chain nonce to avoid drift
            // This is more conservative but prevents "nonce too high" errors
            this.baseNonce = chainNonce;
            this.nextNonce = chainNonce;
            
            console.log(`[NonceManager] Reset to chain nonce: ${chainNonce} (pending: ${this.pendingTransactions.size})`);
            this.lastChainUpdate = timestamp;
        } catch (error) {
            console.error(`[NonceManager] Failed to fetch nonce from chain:`, error);
            // If we don't have any nonce yet, this is a fatal error
            if (this.baseNonce === -1) {
                throw error;
            }
            // Otherwise, continue with optimistic nonce but mark refresh as failed
            console.warn(`[NonceManager] Continuing with cached nonce ${this.nextNonce} due to RPC error`);
        }
    }
    
    /**
     * Check if a nonce error indicates we should retry
     */
    public static isRetryableNonceError(error: string): boolean {
        const retryablePatterns = [
            'nonce too low',
            'nonce too high',
            'replacement fee too low',
            'already known',
            'invalid nonce',
            'nonce has already been used'
        ];
        
        const lowerError = error.toLowerCase();
        return retryablePatterns.some(pattern => lowerError.includes(pattern));
    }
}

/**
 * Execute a transaction with automatic nonce management and retry logic
 */
export async function executeTransactionWithRetry(
    wallet: ethers.Wallet,
    transactionFunction: (nonce: number) => Promise<ethers.providers.TransactionResponse>,
    maxRetries: number = 10 // Increased for high concurrency
): Promise<ethers.providers.TransactionResponse> {
    const nonceManager = OptimisticNonceManager.getInstance(wallet.address);
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const nonce = await nonceManager.getNextNonce(wallet);
            console.log(`[TransactionRetry] Attempt ${attempt + 1}/${maxRetries} with nonce ${nonce}`);
            
            const tx = await transactionFunction(nonce);
            
            // Transaction submitted successfully
            console.log(`[TransactionRetry] Transaction submitted: ${tx.hash} (nonce: ${nonce})`);
            
            // Start confirmation in background (don't await)
            tx.wait().then(() => {
                nonceManager.markTransactionComplete(nonce, true);
                console.log(`[TransactionRetry] Transaction ${tx.hash} confirmed`);
            }).catch((error) => {
                console.error(`[TransactionRetry] Transaction ${tx.hash} failed to confirm:`, error);
                nonceManager.markTransactionComplete(nonce, false);
            });
            
            return tx;
            
        } catch (error) {
            const errorMessage = (error as Error).message;
            lastError = error as Error;
            
            console.error(`[TransactionRetry] Attempt ${attempt + 1} failed:`, errorMessage);
            
            // If it's a nonce error, refresh and retry with backoff
            if (OptimisticNonceManager.isRetryableNonceError(errorMessage)) {
                console.log(`[TransactionRetry] Nonce error detected, refreshing and retrying...`);
                
                // Force refresh nonce from chain
                await nonceManager.forceRefreshNonce(wallet);
                
                // Exponential backoff with jitter to avoid thundering herd
                // Base delay: 50ms, doubles each retry, max 2s
                const baseDelay = 50;
                const maxDelay = 2000;
                const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
                const jitter = Math.random() * 0.3; // ±30% jitter
                const finalDelay = delay * (1 + jitter);
                
                console.log(`[TransactionRetry] Waiting ${finalDelay.toFixed(0)}ms before retry ${attempt + 2}`);
                await new Promise(resolve => setTimeout(resolve, finalDelay));
                
                continue;
            }
            
            // If it's not a nonce error, don't retry
            throw error;
        }
    }
    
    throw new Error(`Transaction failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}