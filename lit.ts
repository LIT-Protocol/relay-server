import { ethers, utils } from "ethers";
import fs from "fs";
import { RedisClientType } from "redis";
import config from "./config";
import redisClient from "./lib/redisClient";
import { AuthMethodType, PKP, StoreConditionWithSigner } from "./models";
import { Sequencer } from "./lib/sequencer";
import { parseEther } from "ethers/lib/utils";
import { LitNodeClientNodeJs } from "@lit-protocol/lit-node-client-nodejs";
import { CapacityToken } from "lit";

const MANZANO_CONTRACT_ADDRESSES =
	"https://lit-general-worker.getlit.dev/manzano-contract-addresses";
const HABANERO_CONTRACT_ADDRESSES =
	"https://lit-general-worker.getlit.dev/habanero-contract-addresses";

const DATIL_DEV_CONTRACT_ADDRESSES =
	"https://lit-general-worker.getlit.dev/datil-dev/contracts";

const DATIL_TEST_CONTRACT_ADDRESSES =
	"https://staging.apis.getlit.dev/datil-test/contracts";

async function getContractFromWorker(
	network: "manzano" | "habanero" | "datil-dev" | "datil-test",
	contractName: string,
	signer?: ethers.Wallet,
) {
	signer = signer ?? getSigner();

	let contractsDataRes;
	switch (network) {
		case "manzano":
			contractsDataRes = await fetch(MANZANO_CONTRACT_ADDRESSES);
			break;
		case "habanero":
			contractsDataRes = await fetch(HABANERO_CONTRACT_ADDRESSES);
			break;
		case "datil-dev":
			contractsDataRes = await fetch(DATIL_DEV_CONTRACT_ADDRESSES);
			break;
		case "datil-test":
			contractsDataRes = await fetch(DATIL_TEST_CONTRACT_ADDRESSES);
			break;
		default:
			throw new Error(`Unsupported network: ${network}`);
	}

	const contractList = (await contractsDataRes.json()).data;

	console.log(
		`Attempting to get contract "${contractName} from "${network}"`,
	);

	// find object where name is == contractName
	const contractData = contractList.find(
		(contract: any) => contract.name === contractName,
	);

	// -- validate
	if (!contractData) {
		throw new Error(`No contract found with name ${contractName}`);
	}

	const contract = contractData.contracts[0];
	console.log(`Contract address: ${contract.address_hash}"`);

	// -- ethers contract
	const ethersContract = new ethers.Contract(
		contract.address_hash,
		contract.ABI,
		signer,
	);

	return ethersContract;
}

export function getProvider() {
	return new ethers.providers.JsonRpcProvider(
		process.env.LIT_TXSENDER_RPC_URL,
	);
}

function getSigner() {
	const provider = getProvider();
	const privateKey = process.env.LIT_TXSENDER_PRIVATE_KEY!;
	const signer = new ethers.Wallet(privateKey, provider);
	return signer;
}

function getContract(abiPath: string, deployedContractAddress: string) {
	const signer = getSigner();
	const contractJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));

	let ethersContract;

	// -- when passing in the API directly
	try {
		ethersContract = new ethers.Contract(
			deployedContractAddress,
			contractJson,
			signer,
		);

		// -- when reading from a file which we have to access the ABI property
	} catch (e) {
		ethersContract = new ethers.Contract(
			deployedContractAddress,
			contractJson.abi,
			signer,
		);
	}
	return ethersContract;
}

function getAccessControlConditionsContract() {
	switch (config.network) {
		case "serrano":
			return getContract(
				"./contracts/serrano/AccessControlConditions.json",
				config?.serranoContract
					?.accessControlConditionsAddress as string,
			);
		case "cayenne":
			return getContract(
				"./contracts/cayenne/AccessControlConditions.json",
				config?.cayenneContracts
					?.accessControlConditionsAddress as string,
			);
	}
}

function getPkpHelperContractAbiPath() {
	if (config.useSoloNet) {
		return "./contracts/serrano/SoloNetPKPHelper.json";
	}
	switch (config.network) {
		case "serrano":
			return "./contracts/serrano/PKPHelper.json";
		case "cayenne":
			return "./contracts/cayenne/PKPHelper.json";
		case "datil-dev":
			return "./contracts/datil-dev/PKPHelper.json";
		case "datil-test":
			return "./contracts/datil-dev/PKPHelper.json";
	}
}

function getPkpNftContractAbiPath() {
	if (config.useSoloNet) {
		return "./contracts/serrano/SoloNetPKP.json";
	}
	switch (config.network) {
		case "serrano":
			return "./contracts/serrano/PKPNFT.json";
		case "cayenne":
			return "./contracts/cayenne/PKPNFT.json";
		case "datil-dev":
			return "./contracts/datil-dev/PKPNFT.json";
		case "datil-test":
			return "./contracts/datil-dev/PKPNFT.json";
	}
}

async function getPkpHelperContract() {
	switch (config.network) {
		case "serrano":
			return getContract(
				getPkpHelperContractAbiPath()!,
				config?.serranoContract?.pkpHelperAddress as string,
			);
		case "cayenne":
			return getContract(
				getPkpHelperContractAbiPath()!,
				config?.cayenneContracts?.pkpHelperAddress as string,
			);
		case "manzano":
			return getContractFromWorker("manzano", "PKPHelper");
		case "habanero":
			return getContractFromWorker("habanero", "PKPHelper");
		case "datil-dev":
			return getContractFromWorker("datil-dev", "PKPHelper");
		case "datil-test":
			return getContractFromWorker("datil-test", "PKPHelper");
	}
}

async function getPermissionsContract() {
	switch (config.network) {
		case "serrano":
			return getContract(
				"./contracts/serrano/PKPPermissions.json",
				config?.serranoContract?.pkpPermissionsAddress as string,
			);
		case "cayenne":
			return getContract(
				"./contracts/cayenne/PKPPermissions.json",
				config?.cayenneContracts?.pkpPermissionsAddress as string,
			);
		case "manzano":
			return getContractFromWorker("manzano", "PKPPermissions");
		case "habanero":
			return getContractFromWorker("habanero", "PKPPermissions");
		case "datil-dev":
			return getContractFromWorker("datil-dev", "PKPPermissions");
		case "datil-test":
			return getContractFromWorker("datil-test", "PKPPermissions");
	}
}

async function getPaymentDelegationContract() {
	switch (config.network) {
		case "manzano":
			return getContractFromWorker("manzano", "PaymentDelegation");
		case "habanero":
			return getContractFromWorker("habanero", "PaymentDelegation");
		default:
			throw new Error(
				"PaymentDelegation contract not available for this network",
			);
	}
}

async function getPkpNftContract() {
	switch (config.network) {
		case "serrano":
			return getContract(
				getPkpNftContractAbiPath()!,
				config?.serranoContract?.pkpNftAddress as string,
			);
		case "cayenne":
			return getContract(
				getPkpNftContractAbiPath()!,
				config?.cayenneContracts?.pkpNftAddress as string,
			);
		case "manzano":
			return await getContractFromWorker("manzano", "PKPNFT");
		case "habanero":
			return await getContractFromWorker("habanero", "PKPNFT");
		case "datil-dev":
			return getContractFromWorker("datil-dev", "PKPNFT");
		case "datil-test":
			return getContractFromWorker("datil-test", "PKPNFT");
	}
}

function prependHexPrefixIfNeeded(hexStr: string) {
	if (hexStr.substring(0, 2) === "0x") {
		return hexStr;
	}
	return `0x${hexStr}`;
}

export async function getPkpEthAddress(tokenId: string) {
	const pkpNft = await getPkpNftContract();
	return pkpNft.getEthAddress(tokenId)!;
}

export async function getPkpPublicKey(tokenId: string) {
	const pkpNft = await getPkpNftContract();
	return pkpNft.getPubkey(tokenId);
}

export async function setSequencerWallet(
	wallet: ethers.Wallet | ethers.providers.JsonRpcProvider,
) {
	Sequencer.Wallet = wallet;
}

export async function storeConditionWithSigner(
	storeConditionRequest: StoreConditionWithSigner,
): Promise<ethers.Transaction> {
	console.log("Storing condition");
	const accessControlConditions = getAccessControlConditionsContract();
	const tx = accessControlConditions?.storeConditionWithSigner(
		prependHexPrefixIfNeeded(storeConditionRequest.key),
		prependHexPrefixIfNeeded(storeConditionRequest.value),
		prependHexPrefixIfNeeded(storeConditionRequest.securityHash),
		storeConditionRequest.chainId,
		storeConditionRequest.permanent,
		utils.getAddress(storeConditionRequest.creatorAddress),
	);
	console.log("tx", tx);
	return tx;
}

export async function mintPKPV2({
	keyType,
	permittedAuthMethodTypes,
	permittedAuthMethodIds,
	permittedAuthMethodPubkeys,
	permittedAuthMethodScopes,
	addPkpEthAddressAsPermittedAddress,
	sendPkpToItself,
}: {
	keyType: string;
	permittedAuthMethodTypes: string[];
	permittedAuthMethodIds: string[];
	permittedAuthMethodPubkeys: string[];
	permittedAuthMethodScopes: string[][];
	addPkpEthAddressAsPermittedAddress: boolean;
	sendPkpToItself: boolean;
}): Promise<ethers.Transaction> {
	console.log(
		"In mintPKPV2",
		keyType,
		permittedAuthMethodTypes,
		permittedAuthMethodIds,
		permittedAuthMethodPubkeys,
		permittedAuthMethodScopes,
		addPkpEthAddressAsPermittedAddress,
		sendPkpToItself,
	);

	console.log("config.network:", config.network);

	const pkpHelper = await getPkpHelperContract();
	const pkpNft = await getPkpNftContract();

	// first get mint cost
	const mintCost = await pkpNft.mintCost();

	const mintTxData =
		await pkpHelper.populateTransaction.mintNextAndAddAuthMethods(
			keyType,
			permittedAuthMethodTypes,
			permittedAuthMethodIds,
			permittedAuthMethodPubkeys,
			permittedAuthMethodScopes,
			addPkpEthAddressAsPermittedAddress,
			sendPkpToItself,
			{ value: mintCost },
		);

	// on our new arb l3, the stylus gas estimation can be too low when interacting with stylus contracts.  manually estimate gas and add 5%.
	const gasLimit = await pkpNft.provider.estimateGas(mintTxData);
	// since the gas limit is a BigNumber we have to use integer math and multiply by 105 then divide by 100 instead of just multiplying by 1.05
	const adjustedGasLimit = gasLimit
		.mul(ethers.BigNumber.from(105))
		.div(ethers.BigNumber.from(100));

	const tx = await pkpHelper.mintNextAndAddAuthMethods(
		keyType,
		permittedAuthMethodTypes,
		permittedAuthMethodIds,
		permittedAuthMethodPubkeys,
		permittedAuthMethodScopes,
		addPkpEthAddressAsPermittedAddress,
		sendPkpToItself,
		{ value: mintCost, gasLimit: adjustedGasLimit },
	);
	console.log("tx", tx);
	return tx;
}

export async function mintPKP({
	authMethodType,
	authMethodId,
	authMethodPubkey,
}: {
	authMethodType: AuthMethodType;
	authMethodId: string;
	authMethodPubkey: string;
}): Promise<ethers.Transaction> {
	console.log("in mintPKP");
	const pkpHelper = await getPkpHelperContract();
	const pkpNft = await getPkpNftContract();

	// first get mint cost
	const mintCost = await pkpNft.mintCost();
	const sequencer = Sequencer.Instance;

	Sequencer.Wallet = getSigner();
	// then, mint PKP using helper
	if (config.useSoloNet) {
		console.info("Minting PKP against SoloNet PKPHelper contract", {
			authMethodType,
			authMethodId,
			authMethodPubkey,
		});

		// Get next unminted PKP pubkey.
		const pkpPubkeyForPkpNft = await getNextAvailablePkpPubkey(redisClient);

		const tx = await sequencer
			.wait({
				action: pkpHelper.mintAndAddAuthMethods,
				params: [
					pkpPubkeyForPkpNft, // In SoloNet, we choose which PKP pubkey we would like to attach to the minted PKP.
					[authMethodType],
					[authMethodId],
					[authMethodPubkey],
					[[ethers.BigNumber.from(1)]],
					true,
					false,
				],
				transactionData: { value: mintCost },
			})
			.catch((e) => {
				console.error("Error while minting pkp", e);
			});

		console.log("tx", tx);
		return tx;
	} else {
		console.info("Minting PKP against PKPHelper contract", {
			authMethodType,
			authMethodId,
			authMethodPubkey,
		});
		const tx = await sequencer.wait({
			action: pkpHelper.mintNextAndAddAuthMethods,
			params: [
				2,
				[authMethodType],
				[authMethodId],
				[authMethodPubkey],
				[[ethers.BigNumber.from(1)]],
				true,
				true,
			],
			transactionData: { value: mintCost },
		});
		console.log("tx", tx);
		return tx;
	}
}

export async function claimPKP({
	keyId,
	signatures,
	authMethodType,
	authMethodId,
	authMethodPubkey,
}: {
	keyId: string;
	signatures: ethers.Signature[];
	authMethodType: AuthMethodType;
	authMethodId: string;
	authMethodPubkey: string;
}): Promise<ethers.Transaction> {
	console.log("in claimPKP");
	const pkpHelper = await getPkpHelperContract();
	const pkpNft = await getPkpNftContract();

	// first get mint cost
	const mintCost = await pkpNft.mintCost();
	const sequencer = Sequencer.Instance;

	Sequencer.Wallet = getSigner();

	// then, mint PKP using helper
	if (config.useSoloNet) {
		console.info("Minting PKP against SoloNet PKPHelper contract", {
			authMethodType,
			authMethodId,
			authMethodPubkey,
		});

		// Get next unminted PKP pubkey.
		const pkpPubkeyForPkpNft = await getNextAvailablePkpPubkey(redisClient);

		const tx = await sequencer
			.wait({
				action: pkpHelper.mintAndAddAuthMethods,
				params: [
					pkpPubkeyForPkpNft, // In SoloNet, we choose which PKP pubkey we would like to attach to the minted PKP.
					[authMethodType],
					[authMethodId],
					[authMethodPubkey],
					[[ethers.BigNumber.from("1")]],
					true,
					false,
				],
				transactionData: { value: mintCost },
			})
			.catch((e) => {
				console.error("Error while minting pkp", e);
			});

		console.log("tx", tx);
		return tx;
	} else {
		console.info("Minting PKP against PKPHelper contract", {
			authMethodType,
			authMethodId,
			authMethodPubkey,
		});
		let tx = await sequencer.wait({
			action: pkpHelper.claimAndMintNextAndAddAuthMethods,
			params: [
				[2, `0x${keyId}`, signatures],
				[
					2,
					[],
					[],
					[],
					[],
					[authMethodType],
					[`0x${authMethodId}`],
					[authMethodPubkey],
					[[ethers.BigNumber.from(1)]],
				],
			],
			transactionData: { value: mintCost },
		});
		console.log("tx", tx);
		return tx;
	}
}

export async function getPKPsForAuthMethod({
	authMethodType,
	idForAuthMethod,
}: {
	authMethodType: AuthMethodType;
	idForAuthMethod: string;
}) {
	if (!authMethodType || !idForAuthMethod) {
		throw new Error(
			"Auth method type and id are required to fetch PKPs by auth method",
		);
	}

	const pkpPermissions = await getPermissionsContract();
	if (pkpPermissions) {
		try {
			const tokenIds = await pkpPermissions.getTokenIdsForAuthMethod(
				authMethodType,
				idForAuthMethod,
			);
			const pkps: PKP[] = [];
			for (let i = 0; i < tokenIds.length; i++) {
				const pubkey = await pkpPermissions.getPubkey(tokenIds[i]);
				if (pubkey) {
					const ethAddress = ethers.utils.computeAddress(pubkey);
					pkps.push({
						tokenId: tokenIds[i],
						publicKey: pubkey,
						ethAddress: ethAddress,
					});
				}
			}
			return pkps;
		} catch (err) {
			throw new Error("Unable to get PKPs for auth method");
		}
	} else {
		throw new Error("Unable to connect to PKP Permissions contract");
	}
}

export async function getPubkeyForAuthMethod({
	authMethodType,
	authMethodId,
}: {
	authMethodType: AuthMethodType;
	authMethodId: string;
}): Promise<string> {
	const permissionsContract = await getPermissionsContract();
	const pubkey = permissionsContract.getUserPubkeyForAuthMethod(
		authMethodType,
		authMethodId,
	);
	return pubkey;
}

export async function sendLitTokens(
	recipientPublicKey: string,
	amount: string,
) {
	const signer = getSigner();

	const tx = await signer.sendTransaction({
		to: recipientPublicKey,
		value: parseEther(amount),
	});

	const reciept = await tx.wait();

	console.log("Sent LIT tokens", reciept.blockHash);

	return reciept.blockHash;
}

export async function mintCapacityCredits({
	signer,
}: {
	signer: ethers.Wallet;
}) {
	if (config.network === "serrano" || config.network === "cayenne") {
		throw new Error(
			`Payment delegation is not available on ${config.network}`,
		);
	}

	const contract = await getContractFromWorker(
		config.network,
		"RateLimitNFT",
		signer,
	);

	if (!contract) {
		throw new Error("Contract is not available");
	}

	// set the expiration to midnight, 15 days from now
	const timestamp = Date.now() + 15 * 24 * 60 * 60 * 1000;
	const futureDate = new Date(timestamp);
	futureDate.setUTCHours(0, 0, 0, 0);

	// Get the Unix timestamp in seconds
	const expires = Math.floor(futureDate.getTime() / 1000);
	console.log("expires is set to", expires);

	const requestsPerKilosecond = 150;

	let cost;
	try {
		cost = await contract.functions.calculateCost(
			requestsPerKilosecond,
			expires,
		);
	} catch (e) {
		console.error(
			"Unable to estimate gas cost for minting capacity credits",
			e,
		);
		return;
	}

	const tx = await contract.functions.mint(expires, {
		value: cost.toString(),
	});
	console.log("mint tx hash: ", tx.hash);
	const res = await tx.wait();

	const tokenIdFromEvent = res.events[0].topics[3];

	return { tx, capacityTokenId: tokenIdFromEvent };
}

function normalizeTokenURI(tokenURI: string) {
	const base64 = tokenURI[0];

	const data = base64.split("data:application/json;base64,")[1];
	const dataToString = Buffer.from(data, "base64").toString("binary");

	return JSON.parse(dataToString);
}

function normalizeCapacity(capacity: any) {
	const [requestsPerMillisecond, expiresAt] = capacity[0];

	return {
		requestsPerMillisecond: parseInt(requestsPerMillisecond.toString()),
		expiresAt: {
			timestamp: parseInt(expiresAt.toString()),
		},
	};
}

async function queryCapacityCredit(
	contract: ethers.Contract,
	owner: string,
	tokenIndexForUser: number,
) {
	console.log(
		`Querying capacity credit for owner ${owner} at index ${tokenIndexForUser}`,
	);

	const tokenId = (
		await contract.functions.tokenOfOwnerByIndex(owner, tokenIndexForUser)
	).toString();
	console.log(`Actually querying tokenId ${tokenId}`);

	try {
		const [URI, capacity, isExpired] = await Promise.all([
			contract.functions.tokenURI(tokenId).then(normalizeTokenURI),
			contract.functions.capacity(tokenId).then(normalizeCapacity),
			contract.functions.isExpired(tokenId),
		]);

		return {
			tokenId,
			URI,
			capacity,
			isExpired: isExpired[0],
		} as CapacityToken;
	} catch (e) {
		// Makes the stack trace a bit more clear as to what actually failed
		throw new Error(
			`Failed to fetch details for capacity token ${tokenId}: ${e}`,
		);
	}
}

export async function queryCapacityCredits(signer: ethers.Wallet) {
	if (config.network === "serrano" || config.network === "cayenne") {
		throw new Error(
			`Payment delegation is not available on ${config.network}`,
		);
	}

	const contract = await getContractFromWorker(
		config.network,
		"RateLimitNFT",
	);
	const count = parseInt(await contract.functions.balanceOf(signer.address));

	return Promise.all(
		[...new Array(count)].map((_, i) =>
			queryCapacityCredit(contract, signer.address, i),
		),
	) as Promise<CapacityToken[]>;
}

export async function addPaymentDelegationPayee({
	wallet,
	payeeAddresses,
}: {
	wallet: ethers.Wallet;
	payeeAddresses: string[];
}) {
	if (config.network === "serrano" || config.network === "cayenne") {
		throw new Error(
			`Payment delegation is not available on ${config.network}`,
		);
	}

	// get the first token that is not expired
	const capacityTokens: CapacityToken[] = await queryCapacityCredits(wallet);
	console.log("Got capacity tokens", JSON.stringify(capacityTokens, null, 2));
	const capacityToken = capacityTokens.find((token) => !token.isExpired);

	let tokenId: number | null = null;

	if (!capacityToken) {
		// mint a new token
		const minted = await mintCapacityCredits({ signer: wallet });

		if (!minted) {
			throw new Error("Failed to mint capacity credits");
		}

		console.log(
			"No capacity token found, minted a new one:",
			minted.capacityTokenId,
		);
		tokenId = minted.capacityTokenId;
	} else {
		tokenId = capacityToken.tokenId;
	}

	if (!tokenId) {
		throw new Error("Failed to get ID for capacity token");
	}

	// add payer in contract
	const provider = getProvider();
	const paymentDelegationContract = await getContractFromWorker(
		config.network,
		"PaymentDelegation",
		wallet,
	);

	const tx = await paymentDelegationContract.functions.delegatePaymentsBatch(
		payeeAddresses,
	);
	console.log("tx hash for delegatePaymentsBatch()", tx.hash);
	await tx.wait();
	return tx;
}

// export function packAuthData({
//   credentialPublicKey,
//   credentialID,
//   counter,
// }: {
//   credentialPublicKey: Buffer;
//   credentialID: Buffer;
//   counter: number;
// }): Buffer {
//   // mint a PKP for this user
//   // first, pack the credential public key, credential id, and counter into bytes
//   const formattedJson = JSON.stringify({
//     pubkey: credentialPublicKey.toString("base64"),
//     cid: credentialID.toString("base64"),
//     counter,
//   });
//   console.log("formattedJson", formattedJson);
//   const packed = Buffer.from(formattedJson, "utf8");
//   console.log("packed", packed);
//   return packed;
// }

/**
 * This function returns the next available PKP that can be minted. Specifically,
 *
 * 1. Gets 1 unminted PKP from the data store - eg. ZRANGEBYSCORE myzset 0 0 LIMIT 0 1
 *    (assuming all unminted PKPs have a score of 0)
 * 2. Sets the score of the PKP to 1 to mark it as "used", optimistically - eg. ZADD myzset 1 0x1234
 * 3. Returns the PKP public key.
 */
export async function getNextAvailablePkpPubkey(redisClient: RedisClientType) {
	// 1. Get 1 unminted PKP from the data store
	const unmintedPkpPubkey = await redisClient.zRangeByScore(
		"pkp_public_keys",
		0,
		0,
		{
			LIMIT: {
				offset: 0,
				count: 1,
			},
		},
	);

	if (unmintedPkpPubkey.length === 0) {
		throw new Error("No more PKPs available");
	}

	const unmintedPkpPubkeyToUse = unmintedPkpPubkey[0];

	// 2. Set the score of the PKP to 1 to mark it as "used", optimistically
	await redisClient.zAdd("pkp_public_keys", {
		score: 1,
		value: unmintedPkpPubkeyToUse,
	});

	// 3. Return the PKP public key
	return unmintedPkpPubkeyToUse;
}
