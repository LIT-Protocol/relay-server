import { asyncHandler } from "../LitChainClient/utils/asyncHandler";
import { LitChainClientAPI } from "../LitChainClient/apis";
import { MintRequestInput } from "../LitChainClient/schemas/mintRequestSchema";
import { ClaimRequestInput } from "../LitChainClient/schemas/claimRequestSchema";
import { JSONStringify as BigIntStringify } from "json-with-bigint";

/**
 * This router includes ALL the APIs for the LitChainClient
 */
export const LitPKPAuthRouter = {
  mintNextAndAddAuthMethods: asyncHandler(
    async ({ body }: { body: MintRequestInput }) => {
      const mintRes = await LitChainClientAPI.mintNextAndAddAuthMethods(body);
      return {
        hash: mintRes.hash,
        decodedLogs: BigIntStringify(mintRes.decodedLogs),
        receipt: BigIntStringify(mintRes.receipt),
      };
    }
  ),
  claimAndMintNextAndAddAuthMethodsWithTypes: asyncHandler(
    async ({ body }: { body: ClaimRequestInput }) => {
      const { derivedKeyId, signatures, authMethodType } = body;
      const mintTx =
        await LitChainClientAPI.claimAndMintNextAndAddAuthMethodsWithTypes({
          derivedKeyId,
          signatures,
          authMethodType,
          authMethodId: derivedKeyId,
          authMethodPubkey: "0x",
        });
      return { requestId: mintTx.hash };
    }
  ),
};
