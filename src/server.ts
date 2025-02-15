import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { env } from "./config/env";
import { rateLimiter } from "./middleware/rateLimiter";
import { apiKeyGateAndTracking } from "./middleware/apiKeyGate";
import { LitChainClientRouter } from "./services/lit/LitChainClient/router";
import { MintRequestInput } from "./services/lit/LitChainClient/schemas/mintRequestSchema";

// Custom serializer for BigInt
const customJSONStringify = (obj: any) => 
  JSON.stringify(obj, (_, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );

// Create Elysia app instance
export const app = new Elysia()
  .use(cors())
  .use(swagger())
  .get("/", () => "Relay Server API")
  .group("/pkp", (app) => {
    app.post(
      "/mint-next-and-add-auth-methods",
      async ({ body }) => {
        const result = await LitChainClientRouter.mintNextAndAddAuthMethods({ 
          body: body as MintRequestInput 
        });
        return new Response(customJSONStringify(result), {
          headers: { 'content-type': 'application/json' },
          status: 200
        });
      }
    );
    app.post(
      "/claim-and-mint-next-and-add-auth-methods-with-types",
      LitChainClientRouter.claimAndMintNextAndAddAuthMethodsWithTypes
    );
    return app;
  })
  .use(rateLimiter)
  .use(apiKeyGateAndTracking)
  .onError(({ error }) => {
    console.error("Server error:", {
      message: error.message,
      stack: error.stack,
    });
    return new Response(customJSONStringify({ error: error.message }), {
      headers: { 'content-type': 'application/json' },
      status: 500
    });
  });

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
