/**
 * Auth Routes
 * Handles PKP minting status and claim operations
 */

import { env } from "config/env";
import { Request, Response, Router } from "express";
import {
  AuthMethodVerifyRegistrationResponse,
  AuthStatus,
  Claim,
  GetAuthStatusRequestParams,
  GetAuthStatusResponse,
} from "../types";
import { getTokenIdFromTransferEvent } from "../utils/receipt";
import { getPkpEthAddress, getPkpPublicKey } from "services/utils";
import { claimPKP } from "services/lit";
import { createLitContracts } from "services/LitContractClient";

export const authRouter = Router();

// Poll mint request status
authRouter.get(
  "/status/:requestId",
  async (
    req: Request<GetAuthStatusRequestParams>,
    res: Response<GetAuthStatusResponse>
  ) => {
    const { blockchainClient } = createLitContracts(env.NETWORK);
    const { requestId } = req.params;

    try {
      const mintReceipt = await blockchainClient.waitForTransaction(
        requestId,
        env.SAFE_BLOCK_CONFIRMATIONS,
        env.MINT_TX_TIMEOUT_MS
      );

      const tokenIdFromEvent = await getTokenIdFromTransferEvent(mintReceipt);
      const [pkpEthAddress, pkpPublicKey] = await Promise.all([
        getPkpEthAddress(tokenIdFromEvent),
        getPkpPublicKey(tokenIdFromEvent),
      ]);

      return res.status(200).json({
        status: AuthStatus.Succeeded,
        pkpTokenId: tokenIdFromEvent,
        pkpEthAddress,
        pkpPublicKey,
      });
    } catch (err) {
      console.error("Error fetching transaction status", {
        txHash: requestId,
        err,
      });

      const error = err as { code?: string };
      if (error.code === "TIMEOUT") {
        return res.status(200).json({
          status: AuthStatus.InProgress,
        });
      }

      return res.status(500).json({
        status: AuthStatus.Failed,
        error: "Unable to fetch status of request",
      });
    }
  }
);

// Claim PKP
authRouter.post(
  "/claim",
  async (
    req: Request<{}, AuthMethodVerifyRegistrationResponse, Claim>,
    res: Response<AuthMethodVerifyRegistrationResponse>
  ) => {
    const { derivedKeyId, signatures, authMethodType } = req.body;

    try {
      const mintTx = await claimPKP({
        keyId: derivedKeyId,
        signatures,
        authMethodType,
        authMethodId: derivedKeyId,
        authMethodPubkey: "0x",
      });

      console.info("Claimed key id: transaction hash (request id): ", {
        requestId: mintTx.hash,
      });

      return res.status(200).json({
        requestId: mintTx.hash,
      });
    } catch (err) {
      console.error("Unable to claim key with key id: ", derivedKeyId, err);
      return res.status(500).json({
        error: `Unable to claim key with derived id: ${derivedKeyId}`,
      });
    }
  }
);
