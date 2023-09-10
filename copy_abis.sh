#!/bin/bash

# change this path to wherever your LitNodeContracts repo lives

CURRENT_DIR=$(pwd)

cd ../lit-assets/blockchain/contracts
npx hardhat compile

cat artifacts/contracts/lit-node/PubkeyRouter.sol/PubkeyRouter.json | jq .abi > $CURRENT_DIR/contracts/PubkeyRouter.json

cat artifacts/contracts/lit-node/PKPPermissions.sol/PKPPermissions.json | jq .abi > $CURRENT_DIR/contracts/PKPPermissions.json

cat artifacts/contracts/lit-node/PKPHelper.sol/PKPHelper.json | jq .abi > $CURRENT_DIR/contracts/PKPHelper.json
