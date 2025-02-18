/**
 * Slack integration for API key request notifications
 */

import { WebClient } from '@slack/web-api';
import { env } from '../../config/env';
import { ApiKeyRequest } from '../supabase/client';

const slack = new WebClient(env.SLACK_BOT_TOKEN);

export const slackClient = {
  /**
   * Send notification for new API key request
   */
  sendNewRequestNotification: async (request: ApiKeyRequest) => {
    try {
      await slack.chat.postMessage({
        channel: env.SLACK_CHANNEL_ID,
        text: 'New API Key Request',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*New API Key Request*'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Email:*\n${request.email}`
              },
              {
                type: 'mrkdwn',
                text: `*Organization:*\n${request.organization_name}`
              },
              {
                type: 'mrkdwn',
                text: `*Application:*\n${request.application_name}`
              },
              {
                type: 'mrkdwn',
                text: `*Usage Description:*\n${request.usage_description}`
              }
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Approve',
                  emoji: true
                },
                style: 'primary',
                value: `approve_${request.id}`
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Deny',
                  emoji: true
                },
                style: 'danger',
                value: `deny_${request.id}`
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Error sending Slack notification:', error);
      throw error;
    }
  }
}; 