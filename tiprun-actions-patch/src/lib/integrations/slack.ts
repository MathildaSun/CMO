import { WebClient } from '@slack/web-api';
import type { KnownBlock } from '@slack/web-api';

const token = process.env.SLACK_BOT_TOKEN as string;
const slack = new WebClient(token);

const CHANNELS: Record<'alerts' | 'updates' | 'wins', string> = {
  alerts: process.env.SLACK_CHANNEL_ALERTS as string,
  updates: process.env.SLACK_CHANNEL_UPDATES as string,
  wins: process.env.SLACK_CHANNEL_WINS as string
};

export async function sendMessage(params: {
  channel: 'alerts' | 'updates' | 'wins';
  text: string;
  blocks?: KnownBlock[];
}): Promise<{ ts: string }> {
  const result = await slack.chat.postMessage({
    channel: CHANNELS[params.channel],
    text: params.text,
    blocks: params.blocks
  });
  return { ts: result.ts as string };
}

export async function sendApprovalRequest(params: {
  title: string;
  details: string;
  requestedBy: string;
  approvalId: string;
}): Promise<{ ts: string }> {
  const blocks: KnownBlock[] = [
    { type: 'header', text: { type: 'plain_text', text: '🔔 Approval Needed' } },
    { type: 'section', text: { type: 'mrkdwn', text: `*${params.title}*\n\n${params.details}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Requested by: ${params.requestedBy}` }] },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: '✅ Approve' }, style: 'primary', action_id: `approve_${params.approvalId}` },
        { type: 'button', text: { type: 'plain_text', text: '❌ Reject' }, style: 'danger', action_id: `reject_${params.approvalId}` }
      ]
    }
  ];
  return sendMessage({ channel: 'alerts', text: `Approval needed: ${params.title}`, blocks });
}
