import { LitChainClientAPI } from "./apis";
import { ClaimRequestInput } from "./schemas/claimRequestSchema";
import { MintRequestInput } from "./schemas/mintRequestSchema";
import { JSONStringify as BigBoyStringify } from 'json-with-bigint';

export const LitChainClientRouter = {
  mintNextAndAddAuthMethods: async ({ body }: { body: MintRequestInput }) => {
    console.log("body:", body);

    try {
      const mintRes = await LitChainClientAPI.mintNextAndAddAuthMethods(body);
      return {
        hash: mintRes.hash,
        decodedLogs: BigBoyStringify(mintRes.decodedLogs),
        receipt: BigBoyStringify(mintRes.receipt),
      };
    } catch (err) {
      console.error("[mintNextAndAddAuthMethodsHandler] Unable to mint PKP", {
        err,
      });
      throw new Error(`Unable to mint PKP ${JSON.stringify(err)}`);
    }
  },

  claimAndMintNextAndAddAuthMethodsWithTypes: async ({
    body,
  }: {
    body: ClaimRequestInput;
  }) => {
    const { derivedKeyId, signatures, authMethodType } = body;

    try {
      const mintTx =
        await LitChainClientAPI.claimAndMintNextAndAddAuthMethodsWithTypes({
          derivedKeyId,
          signatures,
          authMethodType,
          authMethodId: derivedKeyId,
          authMethodPubkey: "0x",
        });

      console.info("Claimed key id: transaction hash (request id): ", {
        requestId: mintTx.hash,
      });

      return { requestId: mintTx.hash };
    } catch (err) {
      console.error("Unable to claim key with key id: ", derivedKeyId, err);
      throw new Error(`Unable to claim key with derived id: ${derivedKeyId}`);
    }
  },
};
