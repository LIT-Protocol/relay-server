/**
 * Supabase client configuration and initialization
 * Provides both public and admin clients for different access levels
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env";

// Types for our database schema
export type ApiKeyRequest = {
  id: string;
  email: string;
  organization_name: string;
  application_name: string;
  usage_description: string;
  eth_wallet_address?: string;
  discord_handle?: string;
  status: "pending" | "approved" | "denied";
  api_key?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
};

export type ApiKeyUsage = {
  id: string;
  api_key_id: string;
  date: string;
  request_count: number;
};

// Public client with limited permissions
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Admin client with full access (for internal operations)
export const adminSupabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Database helper functions
export const db = {
  /**
   * Create a new API key request
   */
  createApiKeyRequest: async (
    request: Omit<ApiKeyRequest, "id" | "created_at" | "status">
  ) => {
    const { data, error } = await supabase
      .from("api_key_requests")
      .insert([
        {
          ...request,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all API key requests
   */
  getApiKeyRequests: async () => {
    const { data, error } = await adminSupabase
      .from("api_key_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Update API key request status
   */
  updateApiKeyRequestStatus: async (
    id: string,
    status: "approved" | "denied",
    approverEmail: string,
    apiKey?: string
  ) => {
    const { data, error } = await adminSupabase
      .from("api_key_requests")
      .update({
        status,
        approved_by: approverEmail,
        approved_at: new Date().toISOString(),
        ...(apiKey && { api_key: apiKey }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Track API key usage
   */
  trackApiKeyUsage: async (apiKeyId: string) => {
    const today = new Date().toISOString().split("T")[0];

    // First try to update existing record
    const { data: existingData, error: existingError } = await adminSupabase
      .from("api_key_usage")
      .update({
        request_count: adminSupabase.rpc('increment_request_count')
      })
      .eq("api_key_id", apiKeyId)
      .eq("date", today)
      .select();

    if (existingError) throw existingError;

    // If no record exists, create new one
    if (!existingData || existingData.length === 0) {
      const { error: insertError } = await adminSupabase
        .from("api_key_usage")
        .insert([
          {
            api_key_id: apiKeyId,
            date: today,
            request_count: 1,
          },
        ]);

      if (insertError) throw insertError;
    }
  },

  /**
   * Get API key usage statistics
   */
  getApiKeyUsage: async (apiKeyId: string) => {
    const { data, error } = await adminSupabase
      .from("api_key_usage")
      .select("*")
      .eq("api_key_id", apiKeyId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },
};
