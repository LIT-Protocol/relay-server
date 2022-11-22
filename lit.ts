import { ethers, utils } from "ethers";
import fs from "fs";
import { AuthMethodType, StoreConditionWithSigner } from "./models";

const accessControlConditionsAddress = "0x247B02100dc0929472945E91299c88b8c80b029E";
const pkpNftAddress = "0x86062B7a01B8b2e22619dBE0C15cbe3F7EBd0E92";
const pkpHelperAddress = "0xffD53EeAD24a54CA7189596eF1aa3f1369753611";
const pkpPermissionsAddress = "0x274d0C69fCfC40f71E57f81E8eA5Bd786a96B832";

export function getProvider() {
  return new ethers.providers.JsonRpcProvider(
    process.env.LIT_TXSENDER_RPC_URL
  );
}

function getSigner() {
  const provider = getProvider();
  const privateKey = process.env.LIT_TXSENDER_PRIVATE_KEY!;
  const signer = new ethers.Wallet(privateKey, provider);
  return signer;
}

function getContract(
  abiPath: string,
  deployedContractAddress: string,
) {
  const signer = getSigner();
  const contractJson = JSON.parse(
    fs.readFileSync(abiPath, "utf8")
  );
  const ethersContract = new ethers.Contract(deployedContractAddress, contractJson, signer);
  return ethersContract;
}

function getAccessControlConditionsContract() {
  return getContract(
    './contracts/AccessControlConditions.json',
    accessControlConditionsAddress,
  );
}

function getPkpHelperContract() {
  return getContract(
    './contracts/PKPHelper.json',
    pkpHelperAddress,
  );
}

function getPermissionsContract() {
  return getContract(
    './contracts/PKPPermissions.json',
    pkpPermissionsAddress,
  );
}

function getPkpNftContract() {
  return getContract(
    './contracts/PKPNFT.json',
    pkpNftAddress,
  );
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
  idForAuthMethod,
}: {
  authMethodType: AuthMethodType;
  idForAuthMethod: string;
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
    [idForAuthMethod],
    ["0x"],
    [[ethers.BigNumber.from("0")]],
    true,
    true,
    { value: mintCost }
  );
  console.log("tx", tx);
  return tx;
}

export async function getPubkeyForAuthMethod({
  credentialID,
}: {
  credentialID: Buffer;
}): Promise<string> {
  const permissionsContract = getPermissionsContract();
  const pubkey = permissionsContract.getUserPubkeyForAuthMethod(
    AuthMethodType.WebAuthn,
    "0x" + credentialID.toString("hex")
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
