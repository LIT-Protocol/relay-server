import { env } from "config/env";
import { BigNumber, ethers } from "ethers";
import { MintNextAndAddAuthMethodsRequest } from "types";
import {
  callWithAdjustedOverrides,
  createLitContracts,
} from "./LitContractClient";

// PKP operations
export async function mintPKP(request: MintNextAndAddAuthMethodsRequest) {
  const { pkpNftContract, pkpHelperContract } = createLitContracts(env.NETWORK);

  // Get mint cost
  const mintCost = await pkpNftContract.mintCost();

  const tx = await callWithAdjustedOverrides(
    pkpHelperContract,
    "mintNextAndAddAuthMethods",
    [
      request.keyType,
      request.permittedAuthMethodTypes,
      request.permittedAuthMethodIds,
      request.permittedAuthMethodPubkeys,
      request.permittedAuthMethodScopes,
      request.addPkpEthAddressAsPermittedAddress,
      request.sendPkpToItself,
    ],
    { value: mintCost }
  );

  await tx.wait();
  return tx;
}

/**
 * Ensures a hex string has '0x' prefix
 * @param value - The hex string to check
 * @returns The hex string with '0x' prefix
 */
function hexPrefixed(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

export async function claimPKP(request: {
  derivedKeyId: string;
  signatures: any[];
  authMethodType: number;
  authMethodId: string;
  authMethodPubkey: string;
}) {
  const { pkpHelperContract } = createLitContracts(env.NETWORK);

  const ECDSA_SECP256K1 = 2;

  const claimMaterial = {
    keyType: ECDSA_SECP256K1,
    derivedKeyId: hexPrefixed(request.derivedKeyId),
    signatures: request.signatures,
  };

  const authMethodData = {
    keyType: ECDSA_SECP256K1,
    permittedIpfsCIDs: [],
    permittedIpfsCIDScopes: [],
    permittedAddresses: [],
    permittedAddressScopes: [],
    permittedAuthMethodTypes: [request.authMethodType],
    permittedAuthMethodIds: [request.authMethodId],
    permittedAuthMethodPubkeys: [hexPrefixed(request.authMethodPubkey)],
    permittedAuthMethodScopes: [],
    addPkpEthAddressAsPermittedAddress: true,
    addPkpPubkeyAsPermittedAuthMethod: true,
    sendPkpToItself: true,
  };

  const tx = await callWithAdjustedOverrides(
    pkpHelperContract,
    "claimAndMintNextAndAddAuthMethodsWithTypes",
    [claimMaterial, authMethodData],
    {},
    ethers.BigNumber.from(100).add("50")
  );

  await tx.wait();
  return tx;
}

if (import.meta.main) {
  const { pkpNftContract } = createLitContracts(env.NETWORK);

  // Get mint cost
  const mintCost = await pkpNftContract.mintCost();
  console.log("Mint cost", Number(mintCost));

  // const tx = await mintPKP({
  //   keyType: 2,
  //   permittedAuthMethodTypes: [2],
  //   permittedAuthMethodIds: [
  //     "0x170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
  //   ],
  //   permittedAuthMethodPubkeys: ["0x"],
  //   permittedAuthMethodScopes: [[1]],
  //   addPkpEthAddressAsPermittedAddress: true,
  //   sendPkpToItself: true,
  // });

  // console.log("Tx", tx);

  const tx2 = await claimPKP({
    derivedKeyId:
      "5dd3cf4bde717a01cca0e2b608d6cd9b415ab49193803c2fd692342096215771",
    signatures: [
      {
        r: "0xf717a0d2ad8ca4871c2ff2ad15af8ee70b12bf7dcec63ff4a41f388bfcaa9058",
        s: "0x2e2e46518a1a6d6088d6a06886d2448f90d1679e63ccc8d990deb455eefe07d4",
        v: 28,
      },
      {
        r: "0x7a6cf330c09c33afb9002c556d6c01ca97c7c798e79f44d1cbfe93d5624ec7ea",
        s: "0x725a0cfa58acaff53691b20bebf71c9aa89bf546d63aeebee271b3cb8fefedb0",
        v: 27,
      },
      {
        r: "0x6f93efb061b40b3b3a0480ea30e40f275439673356813f99cb4211a5816f24fe",
        s: "0x4f0f3b8184225bd7de0f566b5971271d3a44e8888340be82aa6f8b1b62fe3889",
        v: 27,
      },
    ],
    authMethodType: 2,
    authMethodId:
      "0x21bd25220106fc21f2f19c05ee97facd81b4dcb1394795b6f9812be269e19f08",
    authMethodPubkey: "0x",
  });

  console.log("Tx2", tx2);
  console.log("Tx2 hash", tx2.hash);
  const tx2Mined = await tx2.wait();
  console.log("Tx2 mined", tx2Mined);
}
