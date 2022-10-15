import { ethers } from "ethers";
import fs from "fs";

const pkpHelperAddress = "0x08E788DCC3f87B552CE0710e461A81aF1333F489";
const pubkeyRouterAddress = "";

function getSigner() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.LIT_TXSENDER_RPC_URL
  );
  const privateKey = process.env.LIT_TXSENDER_PRIVATE_KEY!;
  const signer = new ethers.Wallet(privateKey, provider);
  return signer;
}

function getPkpHelperContract() {
  const signer = getSigner();
  const contractJson = JSON.parse(
    fs.readFileSync("./contracts/PKPHelper.json", "utf8")
  );
  // console.log("contractJson", contractJson);
  const pkpHelper = new ethers.Contract(
    pkpHelperAddress,
    contractJson.abi,
    signer
  );
  return pkpHelper;
}

function getPubkeyRouterContract() {
  const signer = getSigner();
  const contractJson = JSON.parse(
    fs.readFileSync("./contracts/PubkeyRouterAndPermissions.json", "utf8")
  );
  // console.log("contractJson", contractJson);
  const pubkeyHelper = new ethers.Contract(
    pubkeyRouterAddress,
    contractJson.abi,
    signer
  );
  return pubkeyHelper;
}

export async function mintPKP(authData: Buffer): Promise<ethers.Transaction> {
  console.log("in mintPKP");
  const pkpHelper = getPkpHelperContract();
  // console.log("authData inside mintPKP", authData);
  const tx = await pkpHelper.mintNextAndAddAuthMethods(
    2,
    [],
    [],
    [1],
    [authData],
    { value: ethers.utils.parseEther("0.0001") }
  );
  console.log("tx", tx);
  return tx;
}

export async function findPKPIDs(authData: Buffer): Promise<string> {
  const routerContract = getPubkeyRouterContract();
  const tokenIds = await routerContract.getTokenIdsForAuthMethod(1, authData);
  return tokenIds;
}

export function packAuthData({
  credentialPublicKey,
  credentialID,
  counter,
}: {
  credentialPublicKey: Buffer;
  credentialID: Buffer;
  counter: number;
}): Buffer {
  // mint a PKP for this user
  // first, pack the credential public key, credential id, and counter into bytes
  const formattedJson = JSON.stringify({
    pubkey: credentialPublicKey.toString("base64"),
    cid: credentialID.toString("base64"),
    counter,
  });
  console.log("formattedJson", formattedJson);
  const packed = Buffer.from(formattedJson, "utf8");
  console.log("packed", packed);
  return packed;
}
