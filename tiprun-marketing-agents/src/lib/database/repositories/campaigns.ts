import { supabase } from '../supabase-client.js';

export type CampaignRow = {
  id: string;
  name: string;
  description: string | null;
  objective: 'awareness' | 'waitlist' | 'engagement' | 'conversion';
  status: 'planning' | 'active' | 'paused' | 'completed';
  start_date: string | null;
  end_date: string | null;
  budget_usd: string | null;
  spent_usd: string | null;
  target_metrics: Record<string, unknown> | null;
  actual_metrics: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CampaignCreate = {
  name: string;
  description?: string;
  objective: CampaignRow['objective'];
  status?: CampaignRow['status'];
  startDate?: string;
  endDate?: string;
  budgetUsd?: number;
  targetMetrics?: Record<string, unknown>;
};

export type CampaignUpdate = Partial<CampaignCreate> & {
  spentUsd?: number;
  actualMetrics?: Record<string, unknown>;
};

function toDbCreate(input: CampaignCreate) {
  return {
    name: input.name,
    description: input.description,
    objective: input.objective,
    status: input.status ?? 'planning',
    start_date: input.startDate,
    end_date: input.endDate,
    budget_usd: input.budgetUsd?.toString(),
    target_metrics: input.targetMetrics ?? {}
  } as const;
}

function toDbUpdate(input: CampaignUpdate) {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.description !== undefined) out.description = input.description;
  if (input.objective !== undefined) out.objective = input.objective;
  if (input.status !== undefined) out.status = input.status;
  if (input.startDate !== undefined) out.start_date = input.startDate;
  if (input.endDate !== undefined) out.end_date = input.endDate;
  if (input.budgetUsd !== undefined) out.budget_usd = input.budgetUsd.toString();
  if ('spentUsd' in input && input.spentUsd !== undefined) out.spent_usd = input.spentUsd.toString();
  if (input.targetMetrics !== undefined) out.target_metrics = input.targetMetrics;
  if (input.actualMetrics !== undefined) out.actual_metrics = input.actualMetrics;
  return out;
}

export const campaignsRepo = {
  async create(input: CampaignCreate) {
    const { data, error } = await supabase.from('campaigns').insert(toDbCreate(input)).select().single();
    if (error) throw error;
    return data as unknown as CampaignRow;
  },
  async update(id: string, input: CampaignUpdate) {
    const { data, error } = await supabase.from('campaigns').update(toDbUpdate(input)).eq('id', id).select().single();
    if (error) throw error;
    return data as unknown as CampaignRow;
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single();
    if (error) throw error;
    return data as unknown as CampaignRow;
  }
};
