import { ethers, utils } from "ethers";
import fs from "fs";
import config from "./config";
import { AuthMethodType, StoreConditionWithSigner } from "./models";

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
	const ethersContract = new ethers.Contract(
		deployedContractAddress,
		contractJson,
		signer,
	);
	return ethersContract;
}

function getAccessControlConditionsContract() {
	return getContract(
		"./contracts/AccessControlConditions.json",
		config.accessControlConditionsAddress,
	);
}

function getPkpHelperContract() {
	return getContract("./contracts/PKPHelper.json", config.pkpHelperAddress);
}

function getPermissionsContract() {
	return getContract(
		"./contracts/PKPPermissions.json",
		config.pkpPermissionsAddress,
	);
}

function getPkpNftContract() {
	return getContract("./contracts/PKPNFT.json", config.pkpNftAddress);
}

function prependHexPrefixIfNeeded(hexStr: string) {
	if (hexStr.substring(0, 2) === "0x") {
		return hexStr;
	}
	return `0x${hexStr}`;
}

export async function getPkpEthAddress(tokenId: string) {
	const pkpNft = getPkpNftContract();
	return pkpNft.getEthAddress(tokenId);
}

export async function getPkpPublicKey(tokenId: string) {
	const pkpNft = getPkpNftContract();
	return pkpNft.getPubkey(tokenId);
}

export async function storeConditionWithSigner(
	storeConditionRequest: StoreConditionWithSigner,
): Promise<ethers.Transaction> {
	console.log("Storing condition");
	const accessControlConditions = getAccessControlConditionsContract();
	const tx = await accessControlConditions.storeConditionWithSigner(
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
	const pkpHelper = getPkpHelperContract();
	const pkpNft = getPkpNftContract();

	// first get mint cost
	const mintCost = await pkpNft.mintCost();

	// then, mint PKP using helper
	const tx = await pkpHelper.mintNextAndAddAuthMethods(
		2,
		[authMethodType],
		[authMethodId],
		[authMethodPubkey],
		[[ethers.BigNumber.from("0")]],
		true,
		true,
		{ value: mintCost },
	);
	console.log("tx", tx);
	return tx;
}

export async function getPubkeyForAuthMethod({
	authMethodType,
	authMethodId,
}: {
	authMethodType: AuthMethodType;
	authMethodId: string;
}): Promise<string> {
	const permissionsContract = getPermissionsContract();
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
