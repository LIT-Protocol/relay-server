import { ethers, BigNumber, utils } from "ethers";
import fs from "fs";
import { StoreConditionRequest, StoreConditionWithSigner } from "./models";

const accessControlConditionsAddress = "0x4bb266678E7116D8A1df7aAe7625f9347b01eE85";
const pkpHelperAddress = "0x10992C50D6e7Ea273b1AEcAD1bCf7ffb11E53878";
const pkpPermissionsAddress = "0x2a589078ce1b77f2b932bc4842974e7f995f6a02";
const WEBAUTHN_AUTH_METHOD_TYPE = 1;

function getSigner() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.LIT_TXSENDER_RPC_URL
  );
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

export async function storeConditionWithSigner(
  storeConditionRequest: StoreConditionWithSigner,
): Promise<ethers.Transaction> {
  console.log("Storing condition");
  const accessControlConditions = getAccessControlConditionsContract();
  const tx = await accessControlConditions.storeConditionWithSigner(
    BigNumber.from(storeConditionRequest.key).toHexString(),
    BigNumber.from(storeConditionRequest.value).toHexString(),
    BigNumber.from(storeConditionRequest.securityHash).toHexString(),
    storeConditionRequest.chainId,
    storeConditionRequest.permanent,
    utils.getAddress(storeConditionRequest.creatorAddress),
  );
  console.log("tx", tx);
  return tx;
}

export async function mintPKP({
  credentialPublicKey,
  credentialID,
}: {
  credentialPublicKey: Buffer;
  credentialID: Buffer;
}): Promise<ethers.Transaction> {
  console.log("in mintPKP");
  const pkpHelper = getPkpHelperContract();
  // console.log("authData inside mintPKP", authData);
  const tx = await pkpHelper.mintNextAndAddAuthMethods(
    2,
    [],
    [],
    [WEBAUTHN_AUTH_METHOD_TYPE],
    ["0x" + credentialID.toString("hex")],
    ["0x" + credentialPublicKey.toString("hex")],
    true,
    { value: ethers.utils.parseEther("0.0001") }
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
    WEBAUTHN_AUTH_METHOD_TYPE,
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
