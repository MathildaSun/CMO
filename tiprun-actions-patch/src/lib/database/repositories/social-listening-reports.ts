import { supabase } from '../supabase-client.js';

export type SocialListeningReportRow = {
  id: string;
  report_date: string;
  brand_mentions: number;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  sentiment_score: number | null;
  top_mentions: unknown[] | null;
  competitor_activity: unknown[] | null;
  trending_topics: string[] | null;
  alerts: unknown[] | null;
  recommendations: unknown[] | null;
  full_report: string | null;
  created_at: string;
};

export type SocialListeningReportCreate = {
  reportDate: string;
  brandMentions: number;
  sentimentPositive: number;
  sentimentNeutral: number;
  sentimentNegative: number;
  sentimentScore?: number;
  topMentions?: unknown[];
  competitorActivity?: unknown[];
  trendingTopics?: string[];
  alerts?: unknown[];
  recommendations?: unknown[];
  fullReport?: string;
};

function toDb(input: SocialListeningReportCreate) {
  return {
    report_date: input.reportDate,
    brand_mentions: input.brandMentions,
    sentiment_positive: input.sentimentPositive,
    sentiment_neutral: input.sentimentNeutral,
    sentiment_negative: input.sentimentNegative,
    sentiment_score: input.sentimentScore,
    top_mentions: input.topMentions ?? [],
    competitor_activity: input.competitorActivity ?? [],
    trending_topics: input.trendingTopics ?? [],
    alerts: input.alerts ?? [],
    recommendations: input.recommendations ?? [],
    full_report: input.fullReport ?? null
  } as const;
}

export const socialListeningReportsRepo = {
  async create(input: SocialListeningReportCreate) {
    const { data, error } = await supabase
      .from('social_listening_reports')
      .insert(toDb(input))
      .select()
      .single();
    if (error) throw error;
    return data as unknown as SocialListeningReportRow;
  }
};
