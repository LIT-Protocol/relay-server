/**
 * Authentication middleware for Lit Protocol team members
 * Requires GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables
 */

import { env } from "config/env";
import { Elysia } from "elysia";
import { OAuth2Client } from "google-auth-library";

const oauth2Client = new OAuth2Client({
  clientId: env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
});

// Auth types
export type AuthUser = {
  email: string;
  name: string;
};

export type AuthContext = {
  isTeamMember: () => Promise<boolean>;
  getUser: () => Promise<AuthUser | null>;
};

export const teamAuthMiddleware = new Elysia()
  .derive(async ({ request, set }) => {
    const verifyToken = async () => {
      const token = request.headers.get("Authorization")?.split("Bearer ")[1];
      if (!token) {
        return null;
      }

      try {
        const ticket = await oauth2Client.verifyIdToken({
          idToken: token,
          audience: env.GOOGLE_OAUTH_CLIENT_ID,
        });
        return ticket.getPayload();
      } catch (error) {
        console.error('Token verification failed:', error);
        return null;
      }
    };

    return {
      isTeamMember: async () => {
        const payload = await verifyToken();
        return payload?.hd === "litprotocol.com";
      },
      getUser: async () => {
        const payload = await verifyToken();
        if (!payload || payload.hd !== "litprotocol.com") {
          return null;
        }
        return {
          email: payload.email!,
          name: payload.name!
        };
      }
    } satisfies AuthContext;
  });

// ===== types =====
export interface ApiKeyRequest {
  email: string;
  organizationName: string;
  applicationName: string;
  usage: string;
  ethWalletAddress?: string;
  discordHandle?: string;
  requestId: string;
  status: "pending" | "approved" | "denied";
  timestamp: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ApiKeyUsage {
  date: string;
  count: number;
}
