/**
 * PKP Routes
 * Handles PKP minting and fetching operations
 */

import { Router, Request, Response } from "express";
import { mintPKP } from "../services/lit";
import {
  MintNextAndAddAuthMethodsRequest,
  AuthMethodVerifyRegistrationResponse,
} from "../types";

export const pkpRouter = Router();

// Mint new PKP
pkpRouter.post(
  "/mint-next-and-add-auth-methods",
  async (
    req: Request<
      {},
      AuthMethodVerifyRegistrationResponse,
      MintNextAndAddAuthMethodsRequest
    >,
    res: Response<AuthMethodVerifyRegistrationResponse>
  ) => {
    try {
      const mintTx = await mintPKP(req.body);
      console.info("Minted PKP", { requestId: mintTx.hash });
      return res.status(200).json({ requestId: mintTx.hash });
    } catch (err) {
      console.error("[mintNextAndAddAuthMethodsHandler] Unable to mint PKP", {
        err,
      });
      return res.status(500).json({
        error: `[mintNextAndAddAuthMethodsHandler] Unable to mint PKP ${JSON.stringify(
          err
        )}`,
      });
    }
  }
);
