import { env } from "config/env";
import { BigNumber } from "ethers";
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

export async function claimPKP({
  keyId,
  signatures,
  authMethodType,
  authMethodId,
  authMethodPubkey,
}: {
  keyId: string;
  signatures: any[];
  authMethodType: number;
  authMethodId: string;
  authMethodPubkey: string;
}) {
  const { pkpNftContract, pkpHelperContract } = createLitContracts(env.NETWORK);

  // Get mint cost
  const mintCost = await pkpNftContract.mintCost();


  const tx = await pkpHelperContract.claimAndMintNextAndAddAuthMethods(
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
      [[BigNumber.from(1)]],
    ],
    { value: mintCost }
  );

  await tx.wait();
  return tx;
}

if (import.meta.main) {
  const { blockchainClient, pkpNftContract, pkpHelperContract } =
    createLitContracts(env.NETWORK);

  // Get mint cost
  const mintCost = await pkpNftContract.mintCost();
  console.log("Mint cost", Number(mintCost));

  const tx = await mintPKP({
    keyType: 2,
    permittedAuthMethodTypes: [2],
    permittedAuthMethodIds: [
      "0x170d13600caea2933912f39a0334eca3d22e472be203f937c4bad0213d92ed71",
    ],
    permittedAuthMethodPubkeys: ["0x"],
    permittedAuthMethodScopes: [[1]],
    addPkpEthAddressAsPermittedAddress: true,
    sendPkpToItself: true,
  });

  console.log("Tx", tx);
}
