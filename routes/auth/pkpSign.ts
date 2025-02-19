import { Request } from "express";
import { Response } from "express-serve-static-core";
import { ParsedQs } from "qs";
import * as ethers from "ethers";
import { Sequencer } from "../../lib/sequencer";
import {
	estimateGasWithBalanceOverride,
	removeTxnSignature,
	txnToBytesToSign,
} from "../../utils/eth";
import {
	getSigner,
	initializeLitClient,
	getPkpSessionSigs,
	signWithPkp,
	initializePkpWallet,
} from "../../lit";

interface PKPSignRequest {
	toSign: string;
	pkpPublicKey: string;
	authMethod: any;
	sendTransaction?: boolean;
}

interface PKPSignResponse {
	signature: string;
	requestId?: string;
	error?: string;
}

// Sign a message using PKP
export async function pkpSignHandler(
	req: Request<{}, PKPSignResponse, PKPSignRequest, ParsedQs, Record<string, any>>,
	res: Response<PKPSignResponse, Record<string, any>, number>
) {
	try {
		const { toSign, pkpPublicKey, authMethod, sendTransaction } = req.body;

		// Input validation
		if (!toSign || !pkpPublicKey || !authMethod) {
			return res.status(400).json({
				error: "Missing required parameters: toSign, pkpPublicKey, or authMethod",
				signature: "",
			});
		}

		// Initialize and connect to LitNodeClient
		const litNodeClient = await initializeLitClient();

		// Get session signatures
		const sessionSigs = await getPkpSessionSigs(litNodeClient, pkpPublicKey, authMethod);

		// Use litNodeClient to sign the message
		const signingResult = await signWithPkp(
			litNodeClient,
			pkpPublicKey,
			sessionSigs,
			ethers.utils.arrayify(ethers.utils.hashMessage(toSign))
		);

		// Verify the signature
		const pkpEthAddress = ethers.utils.computeAddress(pkpPublicKey);
		const recoveredAddress = ethers.utils.verifyMessage(toSign, signingResult.signature);

		if (recoveredAddress.toLowerCase() !== pkpEthAddress.toLowerCase()) {
			throw new Error("Signature verification failed");
		}

		// If sendTransaction is true, handle the transaction
		if (sendTransaction) {
			try {
				const sequencer = Sequencer.Instance;
				const signer = getSigner();
				Sequencer.Wallet = signer;
				const provider = signer.provider as ethers.providers.JsonRpcProvider;

				// Parse and fix the transaction
				const parsedTxn = JSON.parse(toSign);

				// Prevent direct ETH transfers - only allow contract interactions
				if (parsedTxn.data === undefined || parsedTxn.data === "0x") {
					return res.status(400).json({
						error:
							"Direct ETH transfers are not allowed. This endpoint is only for contract interactions.",
						signature: signingResult.signature,
					});
				}

				const fixedTxn = {
					...parsedTxn,
					gasLimit: ethers.BigNumber.from(parsedTxn.gasLimit),
					gasPrice: ethers.BigNumber.from(parsedTxn.gasPrice),
					value: ethers.BigNumber.from(parsedTxn.value),
					type: parsedTxn.type || undefined,
					from: pkpEthAddress,
				};

				// First sign the transaction bytes
				const txnWithoutSig = removeTxnSignature(fixedTxn);
				const msgBytes = await txnToBytesToSign(txnWithoutSig);

				// Get a fresh signature for the transaction bytes
				const txnSigningResult = await signWithPkp(
					litNodeClient,
					pkpPublicKey,
					sessionSigs,
					msgBytes
				);

				// Split the signature into components
				const sig = ethers.utils.splitSignature(txnSigningResult.signature);

				// Verify the signature matches the PKP address
				const fromViaSignature = ethers.utils.recoverAddress(msgBytes, sig);

				if (fromViaSignature.toLowerCase() !== pkpEthAddress.toLowerCase()) {
					return res.status(500).json({
						error:
							"Invalid signature - the recovered signature does not match the PKP address",
						signature: signingResult.signature,
					});
				}

				// Check gas price sanity
				const currentGasPrice = await provider.getGasPrice();
				const ALLOWED_GAS_PRICE_DEVIATION_PERCENTAGE = 10;
				const gasPriceFromClient = fixedTxn.gasPrice;
				if (
					gasPriceFromClient.lt(
						currentGasPrice.mul(100 - ALLOWED_GAS_PRICE_DEVIATION_PERCENTAGE).div(100)
					) ||
					gasPriceFromClient.gt(
						currentGasPrice.mul(100 + ALLOWED_GAS_PRICE_DEVIATION_PERCENTAGE).div(100)
					)
				) {
					return res.status(500).json({
						error: `Invalid gas price - the gas price sent by the client of ${gasPriceFromClient.toString()} is not within ${ALLOWED_GAS_PRICE_DEVIATION_PERCENTAGE}% of the current gas price of ${currentGasPrice.toString()}`,
						signature: signingResult.signature,
					});
				}

				// Estimate gas and verify gas limit
				const gasLimit = ethers.BigNumber.from(
					await estimateGasWithBalanceOverride({
						provider,
						txn: fixedTxn,
						walletAddress: pkpEthAddress,
					})
				);

				const ALLOWED_GAS_LIMIT_DEVIATION_PERCENTAGE = 10;
				const gasLimitFromClient = fixedTxn.gasLimit;
				if (
					gasLimitFromClient.lt(
						gasLimit.mul(100 - ALLOWED_GAS_LIMIT_DEVIATION_PERCENTAGE).div(100)
					) ||
					gasLimitFromClient.gt(
						gasLimit.mul(100 + ALLOWED_GAS_LIMIT_DEVIATION_PERCENTAGE).div(100)
					)
				) {
					return res.status(500).json({
						error: `Invalid gas limit - the gas limit sent by the client of ${gasLimitFromClient.toString()} is not within ${ALLOWED_GAS_LIMIT_DEVIATION_PERCENTAGE}% of the gas limit we estimated of ${gasLimit.toString()}`,
						signature: signingResult.signature,
					});
				}

				// Calculate and send gas funding
				const gasToFund = gasLimitFromClient.mul(gasPriceFromClient);
				const gasFundingTxn = await sequencer.wait({
					action: (...args) => {
						const paramsToFn = Object.assign({}, ...args) as ethers.providers.TransactionRequest;
						return signer.sendTransaction(paramsToFn);
					},
					params: [{ to: pkpEthAddress, value: gasToFund }],
					transactionData: {},
				});
				await gasFundingTxn.wait();

				// Initialize PKP wallet for broadcasting
				const pkpWallet = await initializePkpWallet({
					sessionSigs,
					pkpPublicKey,
					litNodeClient,
					provider,
				});

				// Broadcast the transaction using PKP wallet
				const tx = await pkpWallet.sendTransaction({
					to: fixedTxn.to,
					data: fixedTxn.data,
					value: fixedTxn.value,
					gasLimit: gasLimitFromClient,
					gasPrice: gasPriceFromClient,
					nonce: fixedTxn.nonce,
					chainId: fixedTxn.chainId,
				});

				console.info("Successfully signed and sent transaction", {
					signature: signingResult.signature,
					txHash: tx.hash,
					pkpEthAddress,
				});

				return res.status(200).json({
					signature: signingResult.signature,
					requestId: tx.hash,
				});
			} catch (txError) {
				throw new Error(`Failed to process transaction: ${txError}`);
			}
		}

		console.info("Successfully signed and verified message with PKP", {
			signature: signingResult.signature,
			pkpEthAddress,
			recoveredAddress,
		});

		return res.status(200).json({
			signature: signingResult.signature,
		});
	} catch (err) {
		console.error("[pkpSignHandler] Unable to sign message", { err });
		return res.status(500).json({
			error: `[pkpSignHandler] Unable to sign message: ${JSON.stringify(err)}`,
			signature: "",
		});
	}
}
