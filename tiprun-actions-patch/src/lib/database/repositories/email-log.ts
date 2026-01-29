import { supabase } from '../supabase-client.js';

export type EmailLogRow = {
  id: string;
  recipient: string;
  subject: string;
  email_type: 'campaign' | 'outreach' | 'transactional';
  segment: string | null;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  campaign_id: string | null;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type EmailLogCreate = {
  recipient: string;
  subject: string;
  emailType: EmailLogRow['email_type'];
  segment?: string;
  status?: EmailLogRow['status'];
  campaignId?: string;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  metadata?: Record<string, unknown>;
};

function toDb(input: EmailLogCreate) {
  return {
    recipient: input.recipient,
    subject: input.subject,
    email_type: input.emailType,
    segment: input.segment,
    status: input.status ?? 'sent',
    campaign_id: input.campaignId,
    sent_at: input.sentAt,
    opened_at: input.openedAt,
    clicked_at: input.clickedAt,
    metadata: input.metadata ?? {}
  } as const;
}

export const emailLogRepo = {
  async create(input: EmailLogCreate) {
    const { data, error } = await supabase.from('email_log').insert(toDb(input)).select().single();
    if (error) throw error;
    return data as unknown as EmailLogRow;
  }
};
