"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPKPsForAuthMethod = exports.mintPKP = exports.storeConditionWithSigner = exports.getPkpPublicKey = exports.getPkpEthAddress = exports.getProvider = void 0;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const accessControlConditionsAddress = "0x247B02100dc0929472945E91299c88b8c80b029E";
const pkpNftAddress = "0x86062B7a01B8b2e22619dBE0C15cbe3F7EBd0E92";
const pkpHelperAddress = "0xffD53EeAD24a54CA7189596eF1aa3f1369753611";
const pkpPermissionsAddress = "0x274d0C69fCfC40f71E57f81E8eA5Bd786a96B832";
function getProvider() {
    return new ethers_1.ethers.providers.JsonRpcProvider(process.env.LIT_TXSENDER_RPC_URL);
}
exports.getProvider = getProvider;
function getSigner() {
    const provider = getProvider();
    const privateKey = process.env.LIT_TXSENDER_PRIVATE_KEY;
    const signer = new ethers_1.ethers.Wallet(privateKey, provider);
    return signer;
}
function getContract(abiPath, deployedContractAddress) {
    const signer = getSigner();
    const contractJson = JSON.parse(fs_1.default.readFileSync(abiPath, "utf8"));
    const ethersContract = new ethers_1.ethers.Contract(deployedContractAddress, contractJson, signer);
    return ethersContract;
}
function getAccessControlConditionsContract() {
    return getContract("./contracts/AccessControlConditions.json", accessControlConditionsAddress);
}
function getPkpHelperContract() {
    return getContract("./contracts/PKPHelper.json", pkpHelperAddress);
}
function getPermissionsContract() {
    return getContract("./contracts/PKPPermissions.json", pkpPermissionsAddress);
}
function getPkpNftContract() {
    return getContract("./contracts/PKPNFT.json", pkpNftAddress);
}
function prependHexPrefixIfNeeded(hexStr) {
    if (hexStr.substring(0, 2) === "0x") {
        return hexStr;
    }
    return `0x${hexStr}`;
}
async function getPkpEthAddress(tokenId) {
    const pkpNft = getPkpNftContract();
    return pkpNft.getEthAddress(tokenId);
}
exports.getPkpEthAddress = getPkpEthAddress;
async function getPkpPublicKey(tokenId) {
    const pkpNft = getPkpNftContract();
    return pkpNft.getPubkey(tokenId);
}
exports.getPkpPublicKey = getPkpPublicKey;
async function storeConditionWithSigner(storeConditionRequest) {
    console.log("Storing condition");
    const accessControlConditions = getAccessControlConditionsContract();
    const tx = await accessControlConditions.storeConditionWithSigner(prependHexPrefixIfNeeded(storeConditionRequest.key), prependHexPrefixIfNeeded(storeConditionRequest.value), prependHexPrefixIfNeeded(storeConditionRequest.securityHash), storeConditionRequest.chainId, storeConditionRequest.permanent, ethers_1.utils.getAddress(storeConditionRequest.creatorAddress));
    console.log("tx", tx);
    return tx;
}
exports.storeConditionWithSigner = storeConditionWithSigner;
async function mintPKP({ authMethodType, idForAuthMethod, }) {
    console.log("in mintPKP");
    const pkpHelper = getPkpHelperContract();
    const pkpNft = getPkpNftContract();
    // first get mint cost
    const mintCost = await pkpNft.mintCost();
    // then, mint PKP using helper
    const tx = await pkpHelper.mintNextAndAddAuthMethods(2, [authMethodType], [idForAuthMethod], ["0x"], [[ethers_1.ethers.BigNumber.from("0")]], true, true, { value: mintCost });
    console.log("tx", tx);
    return tx;
}
exports.mintPKP = mintPKP;
async function getPKPsForAuthMethod({ authMethodType, idForAuthMethod, }) {
    if (!authMethodType || !idForAuthMethod) {
        throw new Error("Auth method type and id are required to fetch PKPs by auth method");
    }
    const pkpPermissions = getPermissionsContract();
    if (pkpPermissions) {
        try {
            const tokenIds = await pkpPermissions.getTokenIdsForAuthMethod(authMethodType, idForAuthMethod);
            const pkps = [];
            for (let i = 0; i < tokenIds.length; i++) {
                const pubkey = await pkpPermissions.getPubkey(tokenIds[i]);
                if (pubkey) {
                    const ethAddress = ethers_1.ethers.utils.computeAddress(pubkey);
                    pkps.push({
                        tokenId: tokenIds[i],
                        publicKey: pubkey,
                        ethAddress: ethAddress,
                    });
                }
            }
            return pkps;
        }
        catch (err) {
            throw new Error("Unable to get PKPs for auth method");
        }
    }
    else {
        throw new Error("Unable to connect to PKP Permissions contract");
    }
}
exports.getPKPsForAuthMethod = getPKPsForAuthMethod;
// export async function getPubkeyForAuthMethod({
// 	credentialID,
// }: {
// 	credentialID: Buffer;
// }): Promise<string> {
// 	const permissionsContract = getPermissionsContract();
// 	const pubkey = permissionsContract.getUserPubkeyForAuthMethod(
// 		AuthMethodType.WebAuthn,
// 		"0x" + credentialID.toString("hex"),
// 	);
// 	return pubkey;
// }
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
//# sourceMappingURL=lit.js.map