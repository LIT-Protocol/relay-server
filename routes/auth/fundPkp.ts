import { NextFunction, Request, Response } from "express";
import { ethers } from "ethers";
import { getProvider, getSigner } from "../../lit";
import { executeTransactionWithRetry } from "../../lib/optimisticNonceManager";

export async function fundPkpHandler(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const apiKey = req.header("api-key");
		
		// Check if the API key matches the required Vincent API key
		if (apiKey !== process.env.LIT_VINCENT_RELAYER_API_KEY) {
			return res.status(403).json({
				error: "Unauthorized. Invalid API key.",
			});
		}

		const { ethAddress } = req.body;

		if (!ethAddress) {
			return res.status(400).json({
				error: "Missing required parameter: ethAddress",
			});
		}

		// Validate ethereum address format
		if (!ethers.utils.isAddress(ethAddress)) {
			return res.status(400).json({
				error: "Invalid ethereum address format",
			});
		}

		const provider = getProvider();
		const signer = getSigner();

		// Check the balance of the ethereum address
		const balance = await provider.getBalance(ethAddress);
		
		// If balance is not 0, no funding needed
		if (!balance.isZero()) {
			return res.status(200).json({
				message: "Address already has funds, no funding needed",
				currentBalance: ethers.utils.formatEther(balance),
			});
		}

		// Send 0.01 ETH to the address
		const fundingAmount = ethers.utils.parseEther("0.01");
		
		// Use optimistic nonce management for reliable transaction sending
		const tx = await executeTransactionWithRetry(
			signer,
			async (nonce: number) => {
				return await signer.sendTransaction({
					to: ethAddress,
					value: fundingAmount,
					nonce,
				});
			},
		);

		console.log(`Funded PKP address ${ethAddress} with 0.01 ETH. Tx hash: ${tx.hash}`);

		return res.status(200).json({
			message: "Successfully funded PKP address",
			txHash: tx.hash,
			fundedAmount: "0.01",
			recipientAddress: ethAddress,
		});

	} catch (error: any) {
		console.error("Error in fundPkpHandler:", error);
		return res.status(500).json({
			error: "Internal server error: " + error.message,
		});
	}
}