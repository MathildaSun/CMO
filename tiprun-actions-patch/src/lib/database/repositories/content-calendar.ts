import { supabase } from '../supabase-client.js';

export type ContentCalendarRow = {
  id: string;
  title: string;
  content: string;
  platform: 'twitter' | 'instagram' | 'telegram' | 'youtube';
  content_type: 'post' | 'thread' | 'story' | 'reel' | 'video';
  status: 'draft' | 'pending_approval' | 'scheduled' | 'published' | 'failed';
  scheduled_for: string | null;
  published_at: string | null;
  media_urls: string[] | null;
  campaign_id: string | null;
  late_dev_post_id: string | null;
  performance: Record<string, unknown> | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentCalendarCreate = {
  title: string;
  content: string;
  platform: 'twitter' | 'instagram' | 'telegram' | 'youtube';
  contentType: 'post' | 'thread' | 'story' | 'reel' | 'video';
  status?: 'draft' | 'pending_approval' | 'scheduled' | 'published' | 'failed';
  scheduledFor?: string;
  mediaUrls?: string[];
  campaignId?: string;
  lateDevPostId?: string;
  performance?: Record<string, unknown>;
  createdBy: string;
  approvedBy?: string;
};

export type ContentCalendarUpdate = Partial<Omit<ContentCalendarCreate, 'createdBy' | 'platform' | 'title'>> & {
  status?: ContentCalendarRow['status'];
  publishedAt?: string;
};

function toDb(input: ContentCalendarCreate | ContentCalendarUpdate) {
  const out: Record<string, unknown> = {};
  if ('contentType' in input && input.contentType !== undefined) out.content_type = input.contentType;
  if ('scheduledFor' in input && input.scheduledFor !== undefined) out.scheduled_for = input.scheduledFor;
  if ('mediaUrls' in input && input.mediaUrls !== undefined) out.media_urls = input.mediaUrls;
  if ('campaignId' in input && input.campaignId !== undefined) out.campaign_id = input.campaignId;
  if ('lateDevPostId' in input && input.lateDevPostId !== undefined) out.late_dev_post_id = input.lateDevPostId;
  if ('performance' in input && input.performance !== undefined) out.performance = input.performance;
  if ('createdBy' in input && input.createdBy !== undefined) out.created_by = input.createdBy;
  if ('approvedBy' in input && input.approvedBy !== undefined) out.approved_by = input.approvedBy;
  if ('publishedAt' in input && input.publishedAt !== undefined) out.published_at = input.publishedAt;
  if ('status' in input && input.status !== undefined) out.status = input.status;
  if ('title' in input && (input as ContentCalendarCreate).title !== undefined) out.title = (input as ContentCalendarCreate).title;
  if ('content' in input && (input as ContentCalendarCreate).content !== undefined) out.content = (input as ContentCalendarCreate).content;
  if ('platform' in input && (input as ContentCalendarCreate).platform !== undefined) out.platform = (input as ContentCalendarCreate).platform;
  return out;
}

function fromDb(row: ContentCalendarRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    platform: row.platform,
    contentType: row.content_type,
    status: row.status,
    scheduledFor: row.scheduled_for,
    publishedAt: row.published_at,
    mediaUrls: row.media_urls,
    campaignId: row.campaign_id,
    lateDevPostId: row.late_dev_post_id,
    performance: row.performance,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const contentCalendarRepo = {
  async create(input: ContentCalendarCreate) {
    const payload = toDb(input);
    const { data, error } = await supabase.from('content_calendar').insert(payload).select().single();
    if (error) throw error;
    return fromDb(data as unknown as ContentCalendarRow);
  },

  async update(id: string, input: ContentCalendarUpdate) {
    const payload = toDb(input);
    const { data, error } = await supabase.from('content_calendar').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return fromDb(data as unknown as ContentCalendarRow);
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('content_calendar').select('*').eq('id', id).single();
    if (error) throw error;
    return fromDb(data as unknown as ContentCalendarRow);
  }
};
