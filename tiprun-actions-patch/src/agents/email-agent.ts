import { sendEmail } from '../lib/integrations/resend.js';
import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';
import { db } from '../lib/database/index.js';

export type EmailSendOutput = { id: string };

export type EmailCampaignInput = {
  kind: 'campaign';
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  scheduledAt?: string;
  segment?: string;
  campaignId?: string;
};

export type EmailOutreachInput = {
  kind: 'outreach';
  to: string;
  subject: string;
  body: string;
  from?: string;
  segment?: string;
};

export type EmailAgentInput = EmailCampaignInput | EmailOutreachInput;

export const EMAIL_AGENT_PROMPT = `
You are the Email Agent for TipRun, responsible for email campaigns and outreach.
Segments: waitlist, new users, active, lapsed, high value, influencers
Rules: personalize outreach, include unsubscribe in campaigns, log all emails
`;

class EmailAgentImpl implements BaseAgent<EmailAgentInput, EmailSendOutput> {
  id = 'email_agent';
  model = 'claude-haiku';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: EmailAgentInput, ctx?: AgentContext): Promise<EmailSendOutput> {
    if (input.kind === 'campaign') return this.sendCampaign(input, ctx);
    return this.sendOutreach(input, ctx);
  }

  async sendCampaign(input: EmailCampaignInput, ctx?: AgentContext): Promise<EmailSendOutput> {
    try {
      await this.telemetry?.start(this.id, input, ctx);
      const res = await sendEmail({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        from: input.from,
        scheduledAt: input.scheduledAt
      });
      const when = input.scheduledAt || new Date().toISOString();
      for (const r of input.to) {
        await db.emailLog.create({
          recipient: r,
          subject: input.subject,
          emailType: 'campaign',
          segment: input.segment,
          campaignId: input.campaignId,
          sentAt: when
        });
      }
      await this.telemetry?.end(this.id, res, ctx);
      return res;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }

  async sendOutreach(input: EmailOutreachInput, ctx?: AgentContext): Promise<EmailSendOutput> {
    try {
      await this.telemetry?.start(this.id, input, ctx);
      const res = await sendEmail({
        to: input.to,
        subject: input.subject,
        html: input.body,
        from: input.from
      });
      await db.emailLog.create({
        recipient: input.to,
        subject: input.subject,
        emailType: 'outreach',
        segment: input.segment || 'influencers',
        sentAt: new Date().toISOString()
      });
      await this.telemetry?.end(this.id, res, ctx);
      return res;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const EmailAgent = new EmailAgentImpl();
export type EmailAgentType = EmailAgentImpl;
