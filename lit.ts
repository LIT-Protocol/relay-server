import { ethers, utils } from "ethers";
import fs from "fs";
import config from "./config";
import {
	AuthMethodType,
	MintNextAndAddAuthMethodsRequest,
	PKP,
	StoreConditionWithSigner,
} from "./models";
import { Sequencer } from "./lib/sequencer";
import { parseEther } from "ethers/lib/utils";
import { CapacityToken } from "lit";
import { LIT_NETWORK_VALUES } from "@lit-protocol/constants";

import {
	datil,
	datilDev,
	datilTest,
	habanero,
	manzano,
} from "@lit-protocol/contracts";

function getContractFromJsSdk(
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

	// console.log(
	// 	`Attempting to get contract "${contractName} from "${network}"`,
	// );

	// find object where name is == contractName
	const contractData = contractList.find(
		(contract: any) => contract.name === contractName,
	);

	// -- validate
	if (!contractData) {
		throw new Error(`No contract found with name ${contractName}`);
	}

	const contract = contractData.contracts[0];
	// console.log(`Contract address: ${contract.address_hash}"`);

	// -- ethers contract
	const ethersContract = new ethers.Contract(
		contract.address_hash,
		contract.ABI,
		signer,
	);

	return ethersContract;
}

export function getProvider(): ethers.providers.JsonRpcProvider {
	const provider = new ethers.providers.JsonRpcProvider(
		process.env.LIT_TXSENDER_RPC_URL,
	);
	provider.pollingInterval = 200;
	return provider;
}

export function getSigner(): ethers.Wallet {
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

function getPkpHelperContract(network: string): ethers.Contract {
	switch (network) {
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
			return getContractFromJsSdk("manzano", "PKPHelper");
		case "habanero":
			return getContractFromJsSdk("habanero", "PKPHelper");
		case "datil-dev":
			return getContractFromJsSdk("datil-dev", "PKPHelper");
		case "datil-test":
			return getContractFromJsSdk("datil-test", "PKPHelper");
		case "datil":
			return getContractFromJsSdk("datil", "PKPHelper");
		default:
			throw new Error(`Unsupported network: ${network}`);
	}
}

function getPermissionsContract(): ethers.Contract {
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
			return getContractFromJsSdk("manzano", "PKPPermissions");
		case "habanero":
			return getContractFromJsSdk("habanero", "PKPPermissions");
		case "datil-dev":
			return getContractFromJsSdk("datil-dev", "PKPPermissions");
		case "datil-test":
			return getContractFromJsSdk("datil-test", "PKPPermissions");
		case "datil":
			return getContractFromJsSdk("datil", "PKPPermissions");
		default:
			throw new Error(`Unsupported network: ${config.network}`);
	}
}

async function getPaymentDelegationContract() {
	switch (config.network) {
		case "manzano":
			return getContractFromJsSdk("manzano", "PaymentDelegation");
		case "habanero":
			return getContractFromJsSdk("habanero", "PaymentDelegation");
		default:
			throw new Error(
				"PaymentDelegation contract not available for this network",
			);
	}
}

export function getPkpNftContract(network: string): ethers.Contract {
	switch (network) {
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
			return getContractFromJsSdk("manzano", "PKPNFT");
		case "habanero":
			return getContractFromJsSdk("habanero", "PKPNFT");
		case "datil-dev":
			return getContractFromJsSdk("datil-dev", "PKPNFT");
		case "datil-test":
			return getContractFromJsSdk("datil-test", "PKPNFT");
		case "datil":
			return getContractFromJsSdk("datil", "PKPNFT");
		default:
			throw new Error(`Unsupported network: ${network}`);
	}
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

export async function mintPKP({
	keyType,
	permittedAuthMethodTypes,
	permittedAuthMethodIds,
	permittedAuthMethodPubkeys,
	permittedAuthMethodScopes,
	addPkpEthAddressAsPermittedAddress,
	sendPkpToItself,
	burnPkp = false,
	sendToAddressAfterMinting = ethers.constants.AddressZero,
	pkpEthAddressScopes = [],
}: MintNextAndAddAuthMethodsRequest): Promise<ethers.Transaction> {
	console.log("Minting PKP with params:", {
		keyType,
		permittedAuthMethodTypes,
		permittedAuthMethodIds,
		permittedAuthMethodPubkeys,
		permittedAuthMethodScopes,
		addPkpEthAddressAsPermittedAddress,
		sendPkpToItself,
		burnPkp,
		sendToAddressAfterMinting,
	});

	const pkpNft = getPkpNftContract(config.network);

	// first get mint cost
	const mintCost = await pkpNft.mintCost();

	if (config.network === "datil-dev") {
		// use PKP helper v2
		const abiJson = JSON.parse(
			fs.readFileSync("./contracts/datil-dev/PKPHelperV2.json", "utf8"),
		);
		const pkpHelperContractAddress =
			"0x82b48Ddb284cfd9627BA9A29E9Dc605fE654B805";
		const pkpHelper = new ethers.Contract(
			pkpHelperContractAddress,
			abiJson.abi,
			getSigner(),
		);
		const mintTxData =
			await pkpHelper.populateTransaction.mintNextAndAddAuthMethods(
				{
					keyType,
					permittedAuthMethodTypes,
					permittedAuthMethodIds,
					permittedAuthMethodPubkeys,
					permittedAuthMethodScopes,
					addPkpEthAddressAsPermittedAddress,
					pkpEthAddressScopes,
					sendPkpToItself,
					burnPkp,
					sendToAddressAfterMinting,
				},
				{ value: mintCost },
			);

		// on our new arb l3, the stylus gas estimation can be too low when interacting with stylus contracts.  manually estimate gas and add 5%.
		let gasLimit;

		try {
			gasLimit = await pkpNft.provider.estimateGas(mintTxData);
			// since the gas limit is a BigNumber we have to use integer math and multiply by 100 then divide by 100 instead of just multiplying by 1.10
			gasLimit = gasLimit
				.mul(
					ethers.BigNumber.from(
						parseInt(
							process.env["GAS_LIMIT_INCREASE_PERCENTAGE"]!,
						) || 110,
					),
				)
				.div(ethers.BigNumber.from(100));

			// console.log("adjustedGasLimit:", gasLimit);
		} catch (e) {
			console.error("❗️ Error while estimating gas!");
			// uncomment this to use a default gas limit when estimating fails.
			// but you should probably never need to do this and fix the gas estimation issue instead.
			// gasLimit = ethers.utils.hexlify(5000000);
			throw e;
		}

		try {
			const sequencer = Sequencer.Instance;

			Sequencer.Wallet = getSigner();

			const tx = await sequencer.wait({
				action: pkpHelper.mintNextAndAddAuthMethods,
				params: [
					{
						keyType,
						permittedAuthMethodTypes,
						permittedAuthMethodIds,
						permittedAuthMethodPubkeys,
						permittedAuthMethodScopes,
						addPkpEthAddressAsPermittedAddress,
						pkpEthAddressScopes,
						sendPkpToItself,
						burnPkp,
						sendToAddressAfterMinting,
					},
				],
				transactionData: { value: mintCost, gasLimit },
			});

			// console.log("tx", tx);
			return tx;
		} catch (e: any) {
			console.log("❗️ Error while minting pkp:", e);
			throw e;
		}
	} else {
		// PKP helper v1
		const pkpHelper = getPkpHelperContract(config.network);
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
						parseInt(
							process.env["GAS_LIMIT_INCREASE_PERCENTAGE"]!,
						) || 200,
					),
				)
				.div(ethers.BigNumber.from(100));

			console.log("adjustedGasLimit:", gasLimit);
		} catch (e) {
			console.error("❗️ Error while estimating gas!");
			// gasLimit = ethers.utils.hexlify(5000000);
			throw e;
		}

		try {
			const sequencer = Sequencer.Instance;

			Sequencer.Wallet = getSigner();

			const tx = await sequencer.wait({
				action: pkpHelper.mintNextAndAddAuthMethods,
				params: [
					keyType,
					permittedAuthMethodTypes,
					permittedAuthMethodIds,
					permittedAuthMethodPubkeys,
					permittedAuthMethodScopes,
					addPkpEthAddressAsPermittedAddress,
					sendPkpToItself,
				],
				transactionData: { value: mintCost, gasLimit },
			});

			console.log("tx", tx);
			return tx;
		} catch (e: any) {
			console.log("❗️ Error while minting pkp:", e);
			throw e;
		}
	}
}

export async function mintPKPWithSingleAuthMethod({
	authMethodType,
	authMethodId,
	authMethodPubkey,
}: {
	authMethodType: AuthMethodType;
	authMethodId: string;
	authMethodPubkey: string;
}): Promise<ethers.Transaction> {
	return mintPKP({
		keyType: "2",
		permittedAuthMethodTypes: [authMethodType.toString()],
		permittedAuthMethodIds: [authMethodId],
		permittedAuthMethodPubkeys: [authMethodPubkey],
		permittedAuthMethodScopes: [["1"]],
		addPkpEthAddressAsPermittedAddress: true,
		sendPkpToItself: true,
	});
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
		} catch (err: unknown) {
			throw new Error(
				`Unable to get PKPs for auth method: ${(err as Error).message}`,
			);
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

	const contract = await getContractFromJsSdk(
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

	const contract = await getContractFromJsSdk(config.network, "RateLimitNFT");
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
	const paymentDelegationContract = await getContractFromJsSdk(
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
