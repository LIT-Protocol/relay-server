import { ethers } from "ethers";

// the RPC node expects the txn to have gasPrice, nonce, and chainId
// without leading zeroes in hex.  This function ensures that the txn has
// these values and formats them correctly.
export async function prepareTxnForSimulation(
	txn: ethers.providers.TransactionRequest,
) {
	console.log("txn", txn);
	if (
		txn.gasPrice === undefined ||
		txn.nonce === undefined ||
		txn.chainId === undefined
	) {
		throw new Error("Txn is missing gasPrice, nonce, or chainId");
	}
	return {
		...txn,
		gasPrice: ethers.utils.hexValue(txn.gasPrice),
		nonce: ethers.utils.hexValue(txn.nonce),
		chainId: ethers.utils.hexValue(txn.chainId),
		value:
			txn.value === undefined
				? undefined
				: ethers.utils.hexValue(txn.value),
	};
}

// this function estimates the gas for a txn, but overrides the balance of the
// wallet address to simulate the wallet having enough gas to send the txn
// so that we can estimate gas for a wallet that doesn't have any ether
export async function estimateGasWithBalanceOverride({
	provider,
	txn,
	walletAddress,
	balance = ethers.utils.parseEther("1"), // default to 1 eth
}: {
	provider: ethers.providers.JsonRpcProvider;
	txn: ethers.providers.TransactionRequest;
	walletAddress: string;
	balance?: ethers.BigNumber;
}) {
	const stateOverrides = {
		[walletAddress]: {
			balance: ethers.utils.hexValue(balance),
		},
	};

	const txnForSimulation = await prepareTxnForSimulation(txn);

	const gasLimit = await provider.send("eth_estimateGas", [
		txnForSimulation,
		"latest",
		stateOverrides,
	]);

	return gasLimit;
}

// serialize the txn, hash it, and return the bytes to sign
export async function txnToBytesToSign(toSign: ethers.UnsignedTransaction) {
	const rsTx = await ethers.utils.resolveProperties(toSign);
	const serializedTxnToHash = ethers.utils.serializeTransaction(rsTx);
	const msgHash = ethers.utils.keccak256(serializedTxnToHash);
	const msgBytesToSign = ethers.utils.arrayify(msgHash);
	return msgBytesToSign;
}

export function removeTxnSignature(txn: ethers.Transaction) {
	// copy and remove the elements we don't need
	const txnWithoutSig = {
		...txn,
	};
	delete txnWithoutSig.r;
	delete txnWithoutSig.s;
	delete txnWithoutSig.v;
	delete txnWithoutSig.hash;
	delete txnWithoutSig.from;

	return txnWithoutSig;
}
