import { ethers, utils } from "ethers";
import fs from "fs";
import { RedisClientType } from "redis";
import config from "./config";
import redisClient from "./lib/redisClient";
import { AuthMethodType, PKP, StoreConditionWithSigner } from "./models";
import { Sequencer } from "./lib/sequencer";
import { SiweMessage } from "siwe";
import { toUtf8Bytes } from "ethers/lib/utils";

const MANZANO_CONTRACT_ADDRESSES = 'https://lit-general-worker.getlit.dev/manzano-contract-addresses';
const HABANERO_CONTRACT_ADDRESSES = 'https://lit-general-worker.getlit.dev/habanero-contract-addresses';

async function getContractFromWorker(network: 'manzano' | 'habanero', contractName: string) {
	const signer = getSigner();
	const contractsDataRes = await fetch(network === 'manzano' ? MANZANO_CONTRACT_ADDRESSES : HABANERO_CONTRACT_ADDRESSES);
	const contractList = (await contractsDataRes.json()).data;

	console.log(`Attempting to get contract "${contractName} from "${network}"`);

	// find object where name is == contractName
	const contractData = contractList.find((contract: any) => contract.name === contractName);

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

function getPkpHelperV2ContractAbiPath() {
	switch (config.network) {
		case "serrano":
			return "./contracts/serrano/PKPHelperV2.json";
		case "cayenne":
			return "./contracts/cayenne/PKPHelperV2.json";
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

async function getPkpHelperV2Contract() {
	switch (config.network) {
		case "serrano":
			return getContract(
				getPkpHelperV2ContractAbiPath()!,
				config?.serranoContract?.pkpHelperV2Address as string,
			);
		case "cayenne":
			return getContract(
				getPkpHelperV2ContractAbiPath()!,
				config?.cayenneContracts?.pkpHelperV2Address as string,
			);
		case "manzano":
			return getContractFromWorker('manzano', 'PKPHelperV2');
		case "habanero":
			return getContractFromWorker('habanero', 'PKPHelperV2');
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
			return getContractFromWorker('manzano', 'PKPHelper');
		case "habanero":
			return getContractFromWorker('habanero', 'PKPHelper');
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
			return getContractFromWorker('manzano', 'PKPPermissions');
		case "habanero":
			return getContractFromWorker('habanero', 'PKPPermissions');
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
			return await getContractFromWorker('manzano', 'PKPNFT');
		case "habanero":
			return await getContractFromWorker('habanero', 'PKPNFT');
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

export async function mintPKPV3({
	keyType,
	permittedAuthMethodTypes,
	permittedAuthMethodIds,
	permittedAuthMethodPubkeys,
	permittedAuthMethodScopes,
	addPkpEthAddressAsPermittedAddress,
	pkpEthAddressScopes,
	sendPkpToItself,
	burnPkp,
}: {
	keyType: string;
	permittedAuthMethodTypes: string[];
	permittedAuthMethodIds: string[];
	permittedAuthMethodPubkeys: string[];
	permittedAuthMethodScopes: string[][];
	addPkpEthAddressAsPermittedAddress: boolean;
	pkpEthAddressScopes: string[][];
	sendPkpToItself: boolean;
	burnPkp: boolean;
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

	console.log('config.network:', config.network);

	const pkpHelper = await getPkpHelperV2Contract();
	const pkpNft = await getPkpNftContract();

	// first get mint cost
	const mintCost = await pkpNft.mintCost();
	const tx = await pkpHelper.mintNextAndAddAuthMethods(
		keyType,
		permittedAuthMethodTypes,
		permittedAuthMethodIds,
		permittedAuthMethodPubkeys,
		permittedAuthMethodScopes,
		addPkpEthAddressAsPermittedAddress,
		pkpEthAddressScopes,
		sendPkpToItself,
		burnPkp,
		{ value: mintCost },
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

	console.log('config.network:', config.network);

	const pkpHelper = await getPkpHelperContract();
	const pkpNft = await getPkpNftContract();

	// first get mint cost
	const mintCost = await pkpNft.mintCost();
	const tx = await pkpHelper.mintNextAndAddAuthMethods(
		keyType,
		permittedAuthMethodTypes,
		permittedAuthMethodIds,
		permittedAuthMethodPubkeys,
		permittedAuthMethodScopes,
		addPkpEthAddressAsPermittedAddress,
		sendPkpToItself,
		{ value: mintCost },
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
