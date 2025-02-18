/**
 * API Key Request Router
 * Handles all API routes related to API key requests and management
 */

import { Elysia, t } from "elysia";
import { apiKeyService } from "./service";
import { teamAuthMiddleware } from "../../middleware/auth";
import { env } from "../../config/env";

// Define request types
type RequestBody = {
  email: string;
  organization_name: string;
  application_name: string;
  usage_description: string;
  eth_wallet_address?: string;
  discord_handle?: string;
};

type ApproverBody = {
  approverEmail: string;
};

type SlackInteractionPayload = {
  payload: string; // JSON string containing the interaction data
};

// Define request schemas
const requestSchema = t.Object({
  email: t.String(),
  organization_name: t.String(),
  application_name: t.String(),
  usage_description: t.String({ maxLength: 250 }),
  eth_wallet_address: t.Optional(t.String()),
  discord_handle: t.Optional(t.String()),
});

const approverSchema = t.Object({
  approverEmail: t.String(),
});

const slackInteractionSchema = t.Object({
  payload: t.String(),
});

export const apiKeyRouter = new Elysia({ prefix: "/request-key" })
  // Public routes (no auth required)
  .get("/config", () => ({
    googleClientId: env.GOOGLE_OAUTH_CLIENT_ID,
  }))
  .post(
    "/submit",
    async ({ body }: { body: RequestBody }) => {
      const request = await apiKeyService.submitRequest(body);
      return { success: true, request };
    },
    {
      body: requestSchema,
    }
  )
  // Slack interaction endpoint
  .post(
    "/slack/interact",
    async ({ body }: { body: SlackInteractionPayload }) => {
      // Slack sends payload as form-urlencoded
      const payload = JSON.parse(body.payload);
      const [action, requestId] = payload.actions[0].value.split("_");
      const userEmail = payload.user.email;

      if (action === "approve") {
        await apiKeyService.approveRequest(requestId, userEmail);
      } else if (action === "deny") {
        await apiKeyService.denyRequest(requestId, userEmail);
      }

      return { text: `Request ${action}d successfully` };
    },
    {
      body: slackInteractionSchema,
    }
  )
  // Protected routes (team auth required)
  .group("/admin", (app) =>
    app
      .use(teamAuthMiddleware)
      .get("/requests", async () => {
        const requests = await apiKeyService.getAllRequests();
        return { success: true, requests };
      })
      .post(
        "/requests/:id/approve",
        async ({
          params: { id },
          isTeamMember,
          body,
        }: {
          params: { id: string };
          isTeamMember: () => Promise<boolean>;
          body: ApproverBody;
        }) => {
          if (!(await isTeamMember())) {
            throw new Error("Unauthorized");
          }
          const request = await apiKeyService.approveRequest(
            id,
            body.approverEmail
          );
          return { success: true, request };
        },
        {
          body: approverSchema,
        }
      )
      .post(
        "/requests/:id/deny",
        async ({
          params: { id },
          isTeamMember,
          body,
        }: {
          params: { id: string };
          isTeamMember: () => Promise<boolean>;
          body: ApproverBody;
        }) => {
          if (!(await isTeamMember())) {
            throw new Error("Unauthorized");
          }
          const request = await apiKeyService.denyRequest(
            id,
            body.approverEmail
          );
          return { success: true, request };
        },
        {
          body: approverSchema,
        }
      )
      .get(
        "/usage/:apiKeyId",
        async ({
          params: { apiKeyId },
          isTeamMember,
        }: {
          params: { apiKeyId: string };
          isTeamMember: () => Promise<boolean>;
        }) => {
          if (!(await isTeamMember())) {
            throw new Error("Unauthorized");
          }
          const usage = await apiKeyService.getUsageStats(apiKeyId);
          return { success: true, usage };
        }
      )
  );
