# Relay SDK

## Description

The Lit Network Relay SDK is a lightweight JavaScript library that can be used for setting up payment delegations using the Lit Network Relay Server. The SDK provides a simple interface to connect to the Relay server, register a new payer, and add payees.

## Features

- Connect to the Relay server
- Register a new payer
- Add payees to the payer's delegation

## Installation

```bash
npm install @lit-protocol/relay-sdk
```

or

```bash
yarn add @lit-protocol/relay-sdk
```

## Usage

### Registering a new payer:

```javascript
import { LitRelayClient } from '@lit-protocol/relay-sdk';

const client = await LitRelayClient.register('habanero', 'you-api-key');
const secret = client.secret;
```

### Adding a payee:

```javascript
import { LitRelayClient } from '@lit-protocol/relay-sdk';

const client = await LitRelayClient.connect('habanero', 'you-api-key', 'your-payer-secret');
await client.addPayee('0x1234567890123456789012345678901234567890', 100);
```

