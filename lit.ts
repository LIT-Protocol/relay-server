import { ethers, utils } from "ethers";
import fs from "fs";
import { RedisClientType } from "redis";
import config from "./config";
import redisClient from "./lib/redisClient";
import { AuthMethodType, PKP, StoreConditionWithSigner } from "./models";
import { Sequencer } from "./lib/sequencer";
import { parseEther } from "ethers/lib/utils";
import { CapacityToken } from "lit";
import { LIT_NETWORK_VALUES } from "@lit-protocol/constants";
// import {
// 	manzano,
// 	datilDev,
// 	datilTest,
// 	habanero,
// 	datil,
// } from "@lit-protocol/contracts";

import { ThirdWebLib } from "./lib/thirdweb/ThirdWebLib";
import { MintPKPV2 } from "./types/lit";

import { backendWallets } from "./utils/thirdweb/constants";
import { RoundRobin } from "./utils/thirdweb/roundRobin";

const rr = new RoundRobin(backendWallets);

import {
	datil,
	datilDev,
	datilTest,
	habanero,
	manzano,
} from "@lit-protocol/contracts";
import { VersionStrategy } from "./routes/VersionStrategy";

function getContractFromWorker(
	network: LIT_NETWORK_VALUES,
	contractName: string,
	signer?: ethers.Wallet,
) {
	signer = signer ?? getSigner();

	let contractsDataRes;
	switch (network) {
		case "manzano":
			contractsDataRes = manzano;
			break;
		case "habanero":
			contractsDataRes = habanero;
			break;
		case "datil-dev":
			contractsDataRes = datilDev;
			break;
		case "datil-test":
			contractsDataRes = datilTest;

			break;
		case "datil":
			contractsDataRes = datil;
			break;
		default:
			throw new Error(`Unsupported network: ${network}`);
	}

	const contractList = contractsDataRes.data as any;

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
	}
}

async function getPkpHelperContract(network: string) {
	let contract: ethers.Contract | undefined;

	switch (network) {
		case "serrano":
			contract = getContract(
				getPkpHelperContractAbiPath()!,
				config?.serranoContract?.pkpHelperAddress as string,
			);
			break;
		case "cayenne":
			contract = getContract(
				getPkpHelperContractAbiPath()!,
				config?.cayenneContracts?.pkpHelperAddress as string,
			);
			break;
		case "manzano":
			contract = getContractFromWorker("manzano", "PKPHelper");
			break;
		case "habanero":
			contract = getContractFromWorker("habanero", "PKPHelper");
			break;
		case "datil-dev":
			contract = getContractFromWorker("datil-dev", "PKPHelper");
			break;
		case "datil-test":
			contract = getContractFromWorker("datil-test", "PKPHelper");
			break;
		case "datil":
			contract = getContractFromWorker("datil", "PKPHelper");
			break;
		default:
			throw new Error(`Unsupported network: ${network}`);
	}

	if (!contract) {
		throw new Error("PKP Helper contract not available");
	}

	return contract;
}

async function getPermissionsContract() {
	let contract: ethers.Contract | undefined;

	switch (config.network) {
		case "serrano":
			contract = getContract(
				"./contracts/serrano/PKPPermissions.json",
				config?.serranoContract?.pkpPermissionsAddress as string,
			);
			break;
		case "cayenne":
			contract = getContract(
				"./contracts/cayenne/PKPPermissions.json",
				config?.cayenneContracts?.pkpPermissionsAddress as string,
			);
			break;
		case "manzano":
			contract = getContractFromWorker("manzano", "PKPPermissions");
			break;
		case "habanero":
			contract = getContractFromWorker("habanero", "PKPPermissions");
			break;
		case "datil-dev":
			contract = getContractFromWorker("datil-dev", "PKPPermissions");
			break;
		case "datil-test":
			contract = getContractFromWorker("datil-test", "PKPPermissions");
			break;
		case "datil":
			contract = getContractFromWorker("datil", "PKPPermissions");
			break;
		default:
			throw new Error(`Unsupported network: ${config.network}`);
	}

	if (!contract) {
		throw new Error("PKPPermissions contract not available");
	}

	return contract;
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

async function getPkpNftContract(network: string) {
	let contract: ethers.Contract | undefined;

	switch (network) {
		case "serrano":
			contract = getContract(
				getPkpNftContractAbiPath()!,
				config?.serranoContract?.pkpNftAddress as string,
			);
			break;
		case "cayenne":
			contract = getContract(
				getPkpNftContractAbiPath()!,
				config?.cayenneContracts?.pkpNftAddress as string,
			);
			break;
		case "manzano":
			contract = getContractFromWorker("manzano", "PKPNFT");
			break;
		case "habanero":
			contract = getContractFromWorker("habanero", "PKPNFT");
			break;
		case "datil-dev":
			contract = getContractFromWorker("datil-dev", "PKPNFT");
			break;
		case "datil-test":
			contract = getContractFromWorker("datil-test", "PKPNFT");
			break;
		case "datil":
			contract = getContractFromWorker("datil", "PKPNFT");
			break;
	}

	if (!contract) {
		throw new Error("PKP NFT contract not available");
	}

	return contract;
}

function prependHexPrefixIfNeeded(hexStr: string) {
	if (hexStr.substring(0, 2) === "0x") {
		return hexStr;
	}
	return `0x${hexStr}`;
}

export async function getPkpEthAddress(tokenId: string) {
	const pkpNft = await getPkpNftContract(config.network);

	return pkpNft.getEthAddress(tokenId)!;
}

export async function getPkpPublicKey(tokenId: string) {
	const pkpNft = await getPkpNftContract(config.network);

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
	versionStrategy,
}: {
	keyType: string;
	permittedAuthMethodTypes: string[];
	permittedAuthMethodIds: string[];
	permittedAuthMethodPubkeys: string[];
	permittedAuthMethodScopes: string[][];
	addPkpEthAddressAsPermittedAddress: boolean;
	sendPkpToItself: boolean;
	versionStrategy?: VersionStrategy,
}): Promise<MintPKPV2> {
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

	const pkpHelper = await getPkpHelperContract(config.network);
	const pkpNft = await getPkpNftContract(config.network);
	const pkpNftFunctions = {
		mintCost: 'mintCost',
	}

	const pkpHelperFunctions = {
		mintNextAndAddAuthMethods: 'mintNextAndAddAuthMethods',
	}


	// version strategy is required
	if (!versionStrategy) {
		throw new Error("versionStrategy is required");
	}

	// must contain the value in the VersionStrategy enum
	if (!Object.values(VersionStrategy).includes(versionStrategy)) {
		throw new Error(`Invalid version strategy. Must be one of: ${Object.values(VersionStrategy).join(", ")}`);
	}


	// first get mint cost
	const mintCost = await pkpNft[pkpNftFunctions.mintCost]();

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
	let gasLimit;


	


	try {
		gasLimit = await pkpNft.provider.estimateGas(mintTxData);
		// since the gas limit is a BigNumber we have to use integer math and multiply by 200 then divide by 100 instead of just multiplying by 1.05
		gasLimit = gasLimit
			.mul(
				ethers.BigNumber.from(
					parseInt(process.env["GAS_LIMIT_INCREASE_PERCENTAGE"]!) ||
						200,
				),
			)
			.div(ethers.BigNumber.from(100));

		console.log("adjustedGasLimit:", gasLimit);
	} catch (e) {
		console.error("❗️ Error while estimating gas, using default");
		gasLimit = ethers.utils.hexlify(5000000);
	}
	if (versionStrategy === VersionStrategy.DEFAULT) {

		const tx = await pkpHelper.mintNextAndAddAuthMethods(
			keyType,
			permittedAuthMethodTypes,
			permittedAuthMethodIds,
			permittedAuthMethodPubkeys,
			permittedAuthMethodScopes,
			addPkpEthAddressAsPermittedAddress,
			sendPkpToItself,

			{ value: mintCost, gasLimit: gasLimit },
		);
		await tx.wait();
		console.log("tx", tx);
		return tx;
	}
if (versionStrategy === VersionStrategy.FORWARD_TO_THIRDWEB) {
	const address = await rr.next();
	// const mintCost = await ThirdWebLib.Contract.read({
	// 	contractAddress: pkpNft.address,
	// 	functionName: pkpNftFunctions.mintCost,
	// });

	const res = await ThirdWebLib.Contract.write({
		contractAddress: pkpHelper.address,
		functionName: pkpHelperFunctions.mintNextAndAddAuthMethods,
		args: [
			keyType,
			permittedAuthMethodTypes,
			permittedAuthMethodIds,
			permittedAuthMethodPubkeys,
			permittedAuthMethodScopes,
			addPkpEthAddressAsPermittedAddress,
			sendPkpToItself,
		],
		txOverrides: {
			value: mintCost.toString(),
			gasLimit: gasLimit
		},
		// this we have to dynamic using round robin
		backendWalletAddress: address,
	});

	console.log("res:", res);

	return res.result;
}

	

	throw new Error("Invalid version strategy");



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
	const pkpHelper = await getPkpHelperContract(config.network);
	const pkpNft = await getPkpNftContract(config.network);

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
	const pkpHelper = await getPkpHelperContract(config.network);
	const pkpNft = await getPkpNftContract(config.network);

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
			console.log("Unable to get PKPs for auth method", err);
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
