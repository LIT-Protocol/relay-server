# Relay Server

_⚠️ NOTE: This repo is a work in progress._

_This repo was initially made via the instructions from Simple WebAuthn (https://simplewebauthn.dev/docs/advanced/example-project) and provides a fully-functional reference implementation of **@simplewebauthn/server** and **@simplewebauthn/browser**._

Relay Server is a server that is centrally run by the Lit Protocol team to facilitate and subsidize some interactions with the Lit Protocol smart contracts.

The Relay Server hosted by the Lit Protocol team currently only interacts with the smart contracts on the Polygon Mumbai network.

**If you are to use the contract addresses that are hardcoded into this repo, minting a PKP will work but not storing an encryption condition, as our private key is the only authorized signer to store a condition on behalf of an address.**

## Running The Server

### Prerequisites

- Install Redis and have a valid connection to it
- Have access to a valid RPC service endpoint for the network you plan to interact with
- Have access to a ECDSA private key, with its corresponding wallet containing some funds on the network you plan to interact with

### Instructions

Create a `.env` file at the root of the repo and populate the corresponding environment variables:

- `REDIS_URL`
- `PORT`
- `LIT_TXSENDER_RPC_URL`
- `LIT_TXSENDER_PRIVATE_KEY`

Make sure to start your Redis server if you plan to host one locally.

Run `yarn install` to install the dependencies.

Run `yarn start` to start the server.
