/**
 * API Key Service
 * Handles API key request management, generation, and notifications
 */

import { randomBytes } from 'crypto';
import { db } from '../supabase/client';
import { slackClient } from '../slack/client';
import { env } from '../../config/env';

/**
 * Generate a new API key
 * @returns A new API key string
 */
function generateApiKey(): string {
  return `lit_${randomBytes(32).toString('hex')}`;
}

export const apiKeyService = {
  /**
   * Submit a new API key request
   */
  submitRequest: async (request: {
    email: string;
    organization_name: string;
    application_name: string;
    usage_description: string;
    eth_wallet_address?: string;
    discord_handle?: string;
  }) => {
    // Create request in database
    const newRequest = await db.createApiKeyRequest(request);

    // Send Slack notification
    await slackClient.sendNewRequestNotification(newRequest);

    return newRequest;
  },

  /**
   * Approve an API key request
   */
  approveRequest: async (requestId: string, approverEmail: string) => {
    const apiKey = generateApiKey();
    const updatedRequest = await db.updateApiKeyRequestStatus(
      requestId,
      'approved',
      approverEmail,
      apiKey
    );

    // TODO: Send email to user with API key
    // This will be implemented in the next phase

    return updatedRequest;
  },

  /**
   * Deny an API key request
   */
  denyRequest: async (requestId: string, approverEmail: string) => {
    const updatedRequest = await db.updateApiKeyRequestStatus(
      requestId,
      'denied',
      approverEmail
    );

    // TODO: Send email to user about denial
    // This will be implemented in the next phase

    return updatedRequest;
  },

  /**
   * Get all API key requests
   */
  getAllRequests: async () => {
    return db.getApiKeyRequests();
  },

  /**
   * Track API key usage
   */
  trackUsage: async (apiKeyId: string) => {
    await db.trackApiKeyUsage(apiKeyId);
  },

  /**
   * Get API key usage statistics
   */
  getUsageStats: async (apiKeyId: string) => {
    return db.getApiKeyUsage(apiKeyId);
  }
}; 