import { EmailAgent } from '../agents/email-agent.js';

export async function sendEmailCampaign(params: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  scheduledAt?: string;
  segment?: string;
  campaignId?: string;
}) {
  const res = await EmailAgent.sendCampaign({
    kind: 'campaign',
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    from: params.from,
    scheduledAt: params.scheduledAt,
    segment: params.segment,
    campaignId: params.campaignId
  });
  return { id: res.id, recipients: params.to.length };
}
