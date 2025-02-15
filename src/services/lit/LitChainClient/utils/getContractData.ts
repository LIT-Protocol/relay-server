import { LIT_CONTRACT_NAME, NetworkContextType, LitNetwork } from "../_config";

export function getContractData(
  networkContext: NetworkContextType,
  contractName: keyof typeof LIT_CONTRACT_NAME,
  network: LitNetwork
) {
  // if (network === "custom") {
  //   const data = networkContext as unknown as typeof _nagaDev;
  //   return {
  //     abi: data[contractName].abi,
  //     address: data[contractName].address,
  //   };
  // }

  const data = networkContext.data.find(
    (item: { name: string }) => item.name === contractName
  );

  const contractData = data?.contracts[0];

  if (!contractData?.ABI || !contractData?.address_hash) {
    throw new Error(`Contract ${contractName} not found`);
  }

  return {
    abi: contractData.ABI,
    address: contractData.address_hash,
  };
}
