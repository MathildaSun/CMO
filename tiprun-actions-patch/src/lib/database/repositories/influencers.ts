import { supabase } from '../supabase-client.js';

export type InfluencerRow = {
  id: string;
  name: string;
  handle: string;
  platform: 'twitter' | 'instagram' | 'youtube';
  followers: number | null;
  tier: 'nano' | 'micro' | 'mid' | 'macro' | null;
  niche: string[] | null;
  engagement_rate: number | null;
  status:
    | 'identified'
    | 'researched'
    | 'contacted'
    | 'negotiating'
    | 'contracted'
    | 'active'
    | 'completed'
    | 'declined';
  rate_inr: string | null;
  contact_email: string | null;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InfluencerCreate = {
  name: string;
  handle: string;
  platform: InfluencerRow['platform'];
  followers?: number;
  tier?: InfluencerRow['tier'];
  niche?: string[];
  engagementRate?: number;
  status?: InfluencerRow['status'];
  rateInr?: string;
  contactEmail?: string;
  notes?: string;
};

export type InfluencerUpdate = Partial<InfluencerCreate> & {
  lastContactedAt?: string;
};

function toDbCreate(input: InfluencerCreate) {
  return {
    name: input.name,
    handle: input.handle,
    platform: input.platform,
    followers: input.followers,
    tier: input.tier,
    niche: input.niche,
    engagement_rate: input.engagementRate,
    status: input.status ?? 'identified',
    rate_inr: input.rateInr,
    contact_email: input.contactEmail,
    notes: input.notes
  } as const;
}

function toDbUpdate(input: InfluencerUpdate) {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.handle !== undefined) out.handle = input.handle;
  if (input.platform !== undefined) out.platform = input.platform;
  if (input.followers !== undefined) out.followers = input.followers;
  if (input.tier !== undefined) out.tier = input.tier;
  if (input.niche !== undefined) out.niche = input.niche;
  if (input.engagementRate !== undefined) out.engagement_rate = input.engagementRate;
  if (input.status !== undefined) out.status = input.status;
  if (input.rateInr !== undefined) out.rate_inr = input.rateInr;
  if (input.contactEmail !== undefined) out.contact_email = input.contactEmail;
  if (input.notes !== undefined) out.notes = input.notes;
  if (input.lastContactedAt !== undefined) out.last_contacted_at = input.lastContactedAt;
  return out;
}

function fromDb(row: InfluencerRow) {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    platform: row.platform,
    followers: row.followers ?? undefined,
    tier: row.tier ?? undefined,
    niche: row.niche ?? undefined,
    engagementRate: row.engagement_rate ?? undefined,
    status: row.status,
    rateInr: row.rate_inr ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    notes: row.notes ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const influencersRepo = {
  async create(input: InfluencerCreate) {
    const { data, error } = await supabase.from('influencers').insert(toDbCreate(input)).select().single();
    if (error) throw error;
    return fromDb(data as unknown as InfluencerRow);
  },
  async update(id: string, input: InfluencerUpdate) {
    const { data, error } = await supabase.from('influencers').update(toDbUpdate(input)).eq('id', id).select().single();
    if (error) throw error;
    return fromDb(data as unknown as InfluencerRow);
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('influencers').select('*').eq('id', id).single();
    if (error) throw error;
    return fromDb(data as unknown as InfluencerRow);
  }
};
