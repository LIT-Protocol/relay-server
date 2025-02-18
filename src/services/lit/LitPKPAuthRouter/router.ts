import { asyncHandler } from "../LitChainClient/utils/asyncHandler";
import { LitChainClientAPI } from "../LitChainClient/apis";
import { MintRequestInput } from "../LitChainClient/schemas/MintRequestSchema";
import { ClaimRequestInput } from "../LitChainClient/schemas/ClaimRequestSchema";
import { JSONStringify as BigIntStringify } from "json-with-bigint";
import { generateRegistrationOptions } from "../WebAuthn/apis/generationRegistrationOptions";
import { WebAuthnRequestInput } from "../WebAuthn/schemas/WebAuthnRequest";

/**
 * This router includes ALL the APIs for a PKP Auth Service
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
  generateRegistrationOptions: asyncHandler(
    async ({ body }: { body: WebAuthnRequestInput }) => {
      return await generateRegistrationOptions(body);
    }
  ),
};
