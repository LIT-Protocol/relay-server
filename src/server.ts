import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { JSONStringify as BigIntStringify } from "json-with-bigint";
import {
  ClaimRequestInput,
  tClaimRequestSchema,
} from "services/lit/LitChainClient/schemas/ClaimRequestSchema";
import { logger } from "services/lit/LitChainClient/utils/logger";
import {
  tWebAuthnRequestSchema,
  WebAuthnRequestInput,
} from "services/lit/WebAuthn/schemas/WebAuthnRequest";
import { env } from "./config/env";
import { apiKeyGateAndTracking } from "./middleware/apiKeyGate";
import { rateLimiter } from "./middleware/rateLimiter";
import { MintRequestInput } from "./services/lit/LitChainClient/schemas/MintRequestSchema";
import { LitPKPAuthRouter } from "./services/lit/LitPKPAuthRouter/router";
import { tMintRequestSchema } from "./services/lit/LitChainClient/schemas/MintRequestSchema";

export const app = new Elysia()
  .use(apiKeyGateAndTracking)
  .use(cors())
  .use(rateLimiter)
  .use(swagger())
  .get("/test-rate-limit", () => ({ message: "OK" }))
  .onError(({ error }) => {
    const _error = error as unknown as { shortMessage: string };
    return new Response(BigIntStringify({ error: _error.shortMessage }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  })
  .group("/pkp", (app) => {
    app.post(
      "/mint",
      async ({ body }: { body: MintRequestInput }) => {
        const result = await LitPKPAuthRouter.mintNextAndAddAuthMethods({
          body,
        });
        return new Response(BigIntStringify(result), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      },
      { body: tMintRequestSchema }
    );
    app.post(
      "/claim",
      async ({ body }: { body: ClaimRequestInput }) => {
        const result =
          await LitPKPAuthRouter.claimAndMintNextAndAddAuthMethodsWithTypes({
            body,
          });
        return new Response(BigIntStringify(result), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      },
      { body: tClaimRequestSchema }
    );
    app.post(
      "/webauthn/generate-registration-options",
      async ({
        body,
        request,
      }: {
        body: WebAuthnRequestInput;
        request: Request;
      }) => {
        logger.info("request:", request);

        // get origin from request
        const url = request.headers.get("origin") || "http://localhost";

        const result = await LitPKPAuthRouter.generateRegistrationOptions({
          body: {
            url,
            ...(body.username && { username: body.username }),
          },
        });

        return new Response(BigIntStringify(result), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      },
      { body: tWebAuthnRequestSchema }
    );
    return app;
  });

// Start server if not imported as a module
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = env.PORT || 3000;
  app.listen(port, () => {
    console.log("\n🚀 Lit Protocol Auth Service");
    console.log("   Status: Running");
    console.log(`   URL: http://localhost:${port}`);
    console.log("\n🌐 Network Configuration");
    console.log(`   Network: ${env.NETWORK}`);
    console.log(`   RPC URL: ${env.LIT_TXSENDER_RPC_URL}\n`);
  });
}
