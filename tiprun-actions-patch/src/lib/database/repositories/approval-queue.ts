import { supabase } from '../supabase-client.js';

export type ApprovalQueueRow = {
  id: string;
  request_type: 'content' | 'email' | 'spend' | 'outreach';
  requested_by: string;
  title: string;
  details: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  slack_message_ts: string | null;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type ApprovalCreate = {
  requestType: ApprovalQueueRow['request_type'];
  requestedBy: string;
  title: string;
  details: Record<string, unknown>;
  status?: ApprovalQueueRow['status'];
  expiresAt?: string;
};

export type ApprovalUpdate = Partial<{
  status: ApprovalQueueRow['status'];
  slackMessageTs: string;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
}>;

function toDbCreate(input: ApprovalCreate) {
  return {
    request_type: input.requestType,
    requested_by: input.requestedBy,
    title: input.title,
    details: input.details,
    status: input.status ?? 'pending',
    expires_at: input.expiresAt
  } as const;
}

function toDbUpdate(input: ApprovalUpdate) {
  const out: Record<string, unknown> = {};
  if (input.status !== undefined) out.status = input.status;
  if (input.slackMessageTs !== undefined) out.slack_message_ts = input.slackMessageTs;
  if (input.approvedBy !== undefined) out.approved_by = input.approvedBy;
  if (input.approvedAt !== undefined) out.approved_at = input.approvedAt;
  if (input.expiresAt !== undefined) out.expires_at = input.expiresAt;
  return out;
}

export const approvalQueueRepo = {
  async create(input: ApprovalCreate) {
    const { data, error } = await supabase.from('approval_queue').insert(toDbCreate(input)).select().single();
    if (error) throw error;
    return data as unknown as ApprovalQueueRow;
  },
  async update(id: string, input: ApprovalUpdate) {
    const { data, error } = await supabase.from('approval_queue').update(toDbUpdate(input)).eq('id', id).select().single();
    if (error) throw error;
    return data as unknown as ApprovalQueueRow;
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('approval_queue').select('*').eq('id', id).single();
    if (error) throw error;
    return data as unknown as ApprovalQueueRow;
  }
};
