/**
 * Lit Protocol Relay Server
 * Handles PKP minting and management
 */

import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { pkpRouter } from "./routes/pkp";
import { webAuthnRouter } from "./routes/webauthn";
import { authRouter } from "./routes/auth";
import { env } from "./config/env";
import { rateLimiter } from "./middleware/rateLimiter";
import { apiKeyGateAndTracking } from "./middleware/apiKeyGateAndTracking";

// Create Elysia app instance
export const app = new Elysia()
  .use(cors())
  .use(swagger())
  .get("/", () => "Relay Server API")
  .group("/pkp", app => {
    app.post("/mint-next-and-add-auth-methods", pkpRouter.mintNextAndAddAuthMethods);
    app.post("/fetch-pkps-by-auth-method", pkpRouter.fetchPkpsByAuthMethod);
  })
  .group("/auth/webauthn", app => {
    app.get("/generate-registration-options", webAuthnRouter.generateRegistrationOptions);
    app.post("/verify-registration", webAuthnRouter.verifyRegistration);
  })
  .group("/auth", app => {
    app.post("/sign-in", authRouter.signIn);
  })
  .use(rateLimiter)
  .use(apiKeyGateAndTracking);

// Start server if not imported as a module
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🦊 Elysia is running at http://localhost:${port}`);
    console.log(`🌶️ NETWORK: ${env.NETWORK} | RPC: ${env.LIT_TXSENDER_RPC_URL}`);
  });
}
