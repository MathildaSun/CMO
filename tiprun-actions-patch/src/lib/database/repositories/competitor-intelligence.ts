import { supabase } from '../supabase-client.js';

export type CompetitorIntelRow = {
  id: string;
  competitor: string;
  update_type: 'feature' | 'campaign' | 'pricing' | 'partnership' | 'news' | 'funding';
  title: string;
  details: string | null;
  source_url: string | null;
  impact: 'high' | 'medium' | 'low' | null;
  our_response: string | null;
  spotted_at: string;
  created_at: string;
};

export type CompetitorIntelCreate = {
  competitor: string;
  updateType: CompetitorIntelRow['update_type'];
  title: string;
  details?: string;
  source?: string;
  impact?: CompetitorIntelRow['impact'];
  ourResponse?: string;
  spottedAt?: string;
};

function toDb(input: CompetitorIntelCreate) {
  return {
    competitor: input.competitor,
    update_type: input.updateType,
    title: input.title,
    details: input.details,
    source_url: input.source,
    impact: input.impact,
    our_response: input.ourResponse,
    spotted_at: input.spottedAt
  } as const;
}

export const competitorIntelRepo = {
  async create(input: CompetitorIntelCreate) {
    const { data, error } = await supabase.from('competitor_intelligence').insert(toDb(input)).select().single();
    if (error) throw error;
    return data as unknown as CompetitorIntelRow;
  }
};
