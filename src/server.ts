import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { env } from "./config/env";
import { rateLimiter } from "./middleware/rateLimiter";
import { apiKeyGateAndTracking } from "./middleware/apiKeyGate";
import { LitPKPAuthRouter } from "./services/lit/LitPKPAuthRouter/router";
import { MintRequestInput } from "./services/lit/LitChainClient/schemas/mintRequestSchema";
import { JSONStringify as BigIntStringify } from "json-with-bigint";
import { ClaimRequestInput } from "services/lit/LitChainClient/schemas/claimRequestSchema";
import { logger } from "services/lit/LitChainClient/utils/logger";

export const app = new Elysia()
  .use(cors())
  .use(swagger())
  .get("/", () => "Relay Server API")
  .onError(({ error }) => {
    const _error = error as unknown as { shortMessage: string };
    return new Response(BigIntStringify({ error: _error.shortMessage }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  })
  .group("/pkp", (app) => {
    app.post("/mint-next-and-add-auth-methods", async ({ body }) => {
      const result = await LitPKPAuthRouter.mintNextAndAddAuthMethods({
        body: body as MintRequestInput,
      });
      return new Response(BigIntStringify(result), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    app.post(
      "/claim-and-mint-next-and-add-auth-methods-with-types",
      async ({ body }) => {
        const result =
          await LitPKPAuthRouter.claimAndMintNextAndAddAuthMethodsWithTypes({
            body: body as ClaimRequestInput,
          });
        return new Response(BigIntStringify(result), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
    );
    return app;
  })
  .use(rateLimiter)
  .use(apiKeyGateAndTracking);

// Start server if not imported as a module
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = env.PORT || 3000;
  app.listen(port, () => {
    console.log("\n🚀 Lit Protocol Relay Server");
    console.log("   Status: Running");
    console.log(`   URL: http://localhost:${port}`);
    console.log("\n🌐 Network Configuration");
    console.log(`   Network: ${env.NETWORK}`);
    console.log(`   RPC URL: ${env.LIT_TXSENDER_RPC_URL}\n`);
  });
}
