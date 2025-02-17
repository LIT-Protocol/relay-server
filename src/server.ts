import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { JSONStringify as BigIntStringify } from "json-with-bigint";
import { ClaimRequestInput } from "services/lit/LitChainClient/schemas/claimRequestSchema";
import { env } from "./config/env";
import { apiKeyGateAndTracking } from "./middleware/apiKeyGate";
import { rateLimiter } from "./middleware/rateLimiter";
import { MintRequestInput } from "./services/lit/LitChainClient/schemas/mintRequestSchema";
import { LitPKPAuthRouter } from "./services/lit/LitPKPAuthRouter/router";
import { WebAuthnRequestInput } from "services/lit/WebAuthn/schemas/WebAuthnRequest";

export const app = new Elysia()
  .onAfterResponse(() => {
    console.log("Response", performance.now());
  })
  .use(cors())
  .use(swagger())
  .get("/", () => "PKP Auth Service APIs")
  .onError(({ error }) => {
    const _error = error as unknown as { shortMessage: string };
    return new Response(BigIntStringify({ error: _error.shortMessage }), {
      headers: { "content-type": "application/json" },
      status: 500,
    });
  })
  .group("/pkp", (app) => {
    app.post("/mint", async ({ body }) => {
      const result = await LitPKPAuthRouter.mintNextAndAddAuthMethods({
        body: body as MintRequestInput,
      });
      return new Response(BigIntStringify(result), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    app.post("/claim", async ({ body }) => {
      const result =
        await LitPKPAuthRouter.claimAndMintNextAndAddAuthMethodsWithTypes({
          body: body as ClaimRequestInput,
        });
      return new Response(BigIntStringify(result), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });

    app.post(
      "/webauthn/generate-registration-options",
      async ({
        body,
        request,
      }: {
        body: WebAuthnRequestInput;
        request: Request;
      }) => {
        console.log("request:", request);

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
