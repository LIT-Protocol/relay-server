#!/bin/bash

# change this path to wherever your LitNodeContracts repo lives

CURRENT_DIR=$(pwd)

cd ../RustNode/LitNodeContracts
npx hardhat compile

cat artifacts/contracts/PubkeyRouter.sol/PubkeyRouter.json | jq .abi > $CURRENT_DIR/contracts/PubkeyRouter.json

cat artifacts/contracts/PKPPermissions.sol/PKPPermissions.json | jq .abi > $CURRENT_DIR/contracts/PKPPermissions.json

cat artifacts/contracts/PKPHelper.sol/PKPHelper.json | jq .abi > $CURRENT_DIR/contracts/PKPHelper.json

# cat artifacts/contracts/Staking.sol/Staking.json | jq .abi > ../lit_node_rust/abis/Staking.json

cat artifacts/contracts/AccessControlConditions.sol/AccessControlConditions.json | jq .abi > $CURRENT_DIR/contracts/AccessControlConditions.json

# cat artifacts/contracts/RateLimitNFT.sol/RateLimitNFT.json | jq .abi > ../lit_node_rust/abis/RateLimitNFT.json