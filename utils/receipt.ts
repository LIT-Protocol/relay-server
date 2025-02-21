import config from "../config";
import { ethers, providers } from "ethers";
import { getPkpNftContract } from "../lit";

const TRANSFER_EVENT_SIGNATURE =
	"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export async function getTokenIdFromTransferEvent(
	receipt: providers.TransactionReceipt,
): Promise<string> {
	// Filter for the Transfer event.
	const transferEventLog = receipt.logs.find((log) => {
		return (
			log.topics.length > 0 && log.topics[0] === TRANSFER_EVENT_SIGNATURE
		);
	});

	// Validation
	if (!transferEventLog) {
		throw new Error("No Transfer event found in receipt");
	}

	if (transferEventLog.topics.length < 3) {
		throw new Error("Transfer event does not have enough topics");
	}

	return transferEventLog.topics[3];
}

export async function getPKPEthAddressFromPKPMintedEvent(
	receipt: providers.TransactionReceipt,
): Promise<string> {
	const pkpNft = getPkpNftContract(config.network);
	const mintEvent = receipt.logs.find((log) => {
		try {
			return pkpNft.interface.parseLog(log).name === "PKPMinted";
		} catch {
			return false;
		}
	});
	if (!mintEvent) {
		throw new Error("No PKPMinted event found in receipt");
	}
	const pkpPubkey = pkpNft.interface.parseLog(mintEvent).args.pubkey;

	return ethers.utils.computeAddress(pkpPubkey);
}
