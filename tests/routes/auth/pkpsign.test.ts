import request from "supertest";
import express from "express";
import { ethers } from "ethers";
import { pkpSignHandler } from "../../../routes/auth/pkpSign";
import { getSigner } from "../../../lit";
import cors from "cors";
import { LitNodeClientNodeJs } from "@lit-protocol/lit-node-client-nodejs";
import { LitRelay, EthWalletProvider } from "@lit-protocol/lit-auth-client";
import { LIT_NETWORKS_KEYS } from "@lit-protocol/types";

type NetworkType = 'datil-dev' | 'datil-test' | 'datil';

const REGISTRY_ADDRESSES = {
  'datil-dev': '0x2707eabb60D262024F8738455811a338B0ECd3EC',
  'datil-test': '0x525bF2bEb622D7C05E979a8b3fFcDBBEF944450E',
  'datil': '0xBDEd44A02b64416C831A0D82a630488A854ab4b1',
} as const;

// Example ABI for PKP contract interactions
const PKP_PERMISSIONS_ABI = [
  'function addDelegatees(uint256 pkpTokenId, address[] calldata delegatees) external',
  'function getDelegatees(uint256 pkpTokenId) external view returns (address[] memory)'
];

const networks: NetworkType[] = ['datil-dev']//, 'datil-test', 'datil'];

describe.each(networks)('pkpsign Integration Tests on %s', (network) => {
  let app: express.Application;
  let litNodeClient: LitNodeClientNodeJs;
  let provider: ethers.providers.JsonRpcProvider;
  let pkp: any;
  let authMethod: any;
  let pkpTokenId: ethers.BigNumber;

  beforeAll(async () => {
    // Set network for this test suite
    process.env.NETWORK = network;

    // connect to lit so we can sign messages
    litNodeClient = new LitNodeClientNodeJs({
      litNetwork: network,
      debug: false,
    });
    await litNodeClient.connect();

    // Set up provider
    provider = new ethers.providers.JsonRpcProvider(process.env.LIT_TXSENDER_RPC_URL);

    // Get the signer from .env
    const authWallet = getSigner();

    const litRelay = new LitRelay({
      relayUrl: LitRelay.getRelayUrl(network),
      relayApiKey: "test-api-key",
    });

    authMethod = await EthWalletProvider.authenticate({
      signer: authWallet,
      litNodeClient: litNodeClient as any,
    });

    // Mint a new PKP
    pkp = await litRelay.mintPKPWithAuthMethods([authMethod], {
      addPkpEthAddressAsPermittedAddress: true,
      sendPkpToitself: true
    });

    // Log PKP details for debugging
    console.log("Minted PKP:", {
      pkpPublicKey: pkp.pkpPublicKey,
      pkpEthAddress: pkp.pkpEthAddress,
      tokenId: pkp.tokenId,
      network: network,
      fullResponse: pkp // Log the full response to see what we get
    });

    // Get token ID from the minting response
    const tokenId = pkp.pkpTokenId || pkp.tokenId;
    if (!tokenId) {
      throw new Error("Failed to get PKP token ID after minting. Full response: " + JSON.stringify(pkp));
    }

    // Convert hex token ID to decimal BigNumber
    const tokenIdHex = tokenId.startsWith('0x') ? tokenId : `0x${tokenId}`;
    pkpTokenId = ethers.BigNumber.from(tokenIdHex);

    console.log("Token ID conversion:", {
      original: tokenId,
      hex: tokenIdHex,
      decimal: pkpTokenId.toString(),
      network: network
    });
  }, 60000); // Increase timeout to 60 seconds

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cors());
    app.post("/pkp-sign", pkpSignHandler);
  });

  afterAll(async () => {
    await litNodeClient.disconnect();
    if (provider instanceof ethers.providers.JsonRpcProvider) {
      // Remove all listeners from the provider
      provider.removeAllListeners();
    }
    // Clear any remaining timeouts
    jest.clearAllTimers();
  });

  it(`should successfully sign a message using PKP on ${network}`, async () => {
    const messageToSign = "Hello, World!";

    const response = await request(app)
      .post("/pkp-sign")
      .send({
        toSign: messageToSign,
        pkpPublicKey: pkp.pkpPublicKey,
        authMethod: authMethod,
      })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toHaveProperty("signature");
    expect(response.body.signature).toBeTruthy();
    expect(pkp.pkpEthAddress).toBeTruthy();

    // Verify the signature was made by the PKP
    const recoveredAddress = ethers.utils.verifyMessage(
      messageToSign,
      response.body.signature
    );
    expect(recoveredAddress.toLowerCase()).toBe(pkp.pkpEthAddress!.toLowerCase());
  });

  it(`should successfully sign a contract interaction using PKP on ${network}`, async () => {
    // Get the correct contract address for the current network
    const contractAddress = REGISTRY_ADDRESSES[network];
    
    // Create a contract interface for testing
    const iface = new ethers.utils.Interface(PKP_PERMISSIONS_ABI);
    
    // Generate a random Ethereum address as delegatee
    const delegatee = ethers.Wallet.createRandom().address;
    
    // Create addDelegatees transaction data
    const data = iface.encodeFunctionData("addDelegatees", [
      pkpTokenId,
      [delegatee] // Array with single random delegatee address
    ]);

    console.log("Contract interaction details:", {
      tokenId: {
        hex: pkpTokenId.toHexString(),
        decimal: pkpTokenId.toString()
      },
      pkpAddress: pkp.pkpEthAddress,
      delegatee,
      contractAddress,
      network,
      encodedData: data,
    });
    
    const transaction = {
      to: contractAddress,
      data: data,
      value: "0x0",
      gasPrice: await provider.getGasPrice(),
      nonce: await provider.getTransactionCount(pkp.pkpEthAddress),
      gasLimit: ethers.BigNumber.from(179970),
      chainId: (await provider.getNetwork()).chainId,
    };

    // Try to validate the transaction will succeed
    try {
      const contract = new ethers.Contract(contractAddress, PKP_PERMISSIONS_ABI, provider);
      await contract.callStatic.addDelegatees(pkpTokenId, [delegatee], {
        from: pkp.pkpEthAddress
      });
    } catch (error: any) {
      console.log("Contract call validation failed:", {
        error: error.message,
        reason: error.reason,
        code: error.code,
        data: error.data,
        pkpAddress: pkp.pkpEthAddress,
        tokenId: pkpTokenId.toString(),
        delegatee,
        network
      });
    }

    // Log full transaction details
    console.log("Full transaction details:", {
      ...transaction,
      pkpPublicKey: pkp.pkpPublicKey,
      pkpEthAddress: pkp.pkpEthAddress,
      tokenId: pkpTokenId.toString(),
      network
    });

    try {
      const response = await request(app)
        .post("/pkp-sign")
        .send({
          toSign: JSON.stringify(transaction),
          pkpPublicKey: pkp.pkpPublicKey,
          authMethod: authMethod,
          sendTransaction: true
        });

      console.log("Response from pkp-sign:", {
        status: response.status,
        body: response.body,
        txHash: response.body.requestId,
        network
      });

      // Log transaction hash separately for easy copying
      if (response.body.requestId) {
        console.log("Transaction hash:", response.body.requestId);
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("requestId");
      expect(response.body.requestId).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Wait for transaction to be mined
      const txHash = response.body.requestId;
      await provider.waitForTransaction(txHash);

      // Verify the delegatee was added
      const contract = new ethers.Contract(contractAddress, PKP_PERMISSIONS_ABI, provider);
      const delegatees = await contract.getDelegatees(pkpTokenId);
      console.log("Delegatees after transaction:", {
        delegatees: delegatees.map((d: string) => d.toLowerCase()),
        expectedDelegatee: delegatee.toLowerCase(),
        network
      });

      // Check if our delegatee is in the list
      expect(delegatees.map((d: string) => d.toLowerCase()))
        .toContain(delegatee.toLowerCase());

    } catch (error: any) {
      console.log("Error from pkp-sign request:", {
        error: error.message,
        response: error.response?.body,
        errorDetails: error.response?.body?.error,
        network
      });
      throw error;
    }
  }, 60000);

  it(`should reject direct ETH transfers on ${network}`, async () => {
    // Create a simple ETH transfer transaction
    const transaction = {
      to: ethers.Wallet.createRandom().address,
      value: ethers.utils.parseEther("0.1"),
      gasPrice: await provider.getGasPrice(),
      nonce: await provider.getTransactionCount(pkp.pkpEthAddress),
      gasLimit: ethers.BigNumber.from(21000),
      chainId: (await provider.getNetwork()).chainId,
      data: "0x" // Empty data field indicates ETH transfer
    };

    const response = await request(app)
      .post("/pkp-sign")
      .send({
        toSign: JSON.stringify(transaction),
        pkpPublicKey: pkp.pkpPublicKey,
        authMethod: authMethod,
        sendTransaction: true
      })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body.error).toContain("Direct ETH transfers are not allowed");
  });

  it(`should fail with missing parameters on ${network}`, async () => {
    const response = await request(app)
      .post("/pkp-sign")
      .send({
        toSign: "Hello, World!",
        // Missing pkpPublicKey and authMethod
      })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("Missing required parameters");
  });
}); 