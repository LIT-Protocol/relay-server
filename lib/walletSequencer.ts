import { ethers } from 'ethers';
import { Sequencer } from './sequencer';

/**
 * Manages sequencers per wallet address to prevent nonce collisions
 * when the same wallet is used for multiple concurrent transactions
 */
export class WalletSequencerManager {
    private static instance: WalletSequencerManager;
    private sequencers: Map<string, Sequencer> = new Map();
    private locks: Map<string, Promise<void>> = new Map();
    
    private constructor() {}
    
    public static getInstance(): WalletSequencerManager {
        if (!WalletSequencerManager.instance) {
            WalletSequencerManager.instance = new WalletSequencerManager();
        }
        return WalletSequencerManager.instance;
    }
    
    /**
     * Get or create a sequencer for a specific wallet address
     */
    public getSequencerForWallet(address: string): Sequencer {
        const normalizedAddress = address.toLowerCase();
        
        if (!this.sequencers.has(normalizedAddress)) {
            const sequencer = new Sequencer();
            this.sequencers.set(normalizedAddress, sequencer);
        }
        
        return this.sequencers.get(normalizedAddress)!;
    }
    
    /**
     * Execute a transaction using the appropriate sequencer for the wallet
     */
    public async executeTransaction(
        wallet: ethers.Wallet,
        action: any,
        params: any[],
        transactionData?: Record<string, any>
    ): Promise<ethers.providers.TransactionResponse> {
        const address = wallet.address.toLowerCase();
        const sequencer = this.getSequencerForWallet(address);
        
        // Set the wallet for this specific sequencer instance
        (sequencer as any).wallet = wallet;
        
        // Execute through the sequencer
        const tx = await sequencer.wait({
            action,
            params,
            transactionData: transactionData || {}
        });
        
        return tx;
    }
    
    /**
     * Clear a sequencer for a wallet (useful for testing or cleanup)
     */
    public clearSequencer(address: string): void {
        const normalizedAddress = address.toLowerCase();
        const sequencer = this.sequencers.get(normalizedAddress);
        
        if (sequencer) {
            sequencer.stop();
            this.sequencers.delete(normalizedAddress);
        }
    }
    
    /**
     * Clear all sequencers
     */
    public clearAll(): void {
        for (const sequencer of this.sequencers.values()) {
            sequencer.stop();
        }
        this.sequencers.clear();
        this.locks.clear();
    }
}

export default WalletSequencerManager.getInstance();