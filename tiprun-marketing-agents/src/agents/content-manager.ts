import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';
import { CreativesAgent } from './creatives-agent.js';
import { db } from '../lib/database/index.js';
import { LatePlatform } from '../lib/integrations/late-dev.js';

export type ContentManagerInput = {
  task: string;
  brief: string;
  platforms: LatePlatform[];
  contentType: 'post' | 'thread' | 'story' | 'reel' | 'video';
  includeImage?: boolean;
  scheduledFor?: string;
  campaignId?: string;
  autoApprove?: boolean;
};

export type ContentManagerOutput = {
  title: string;
  content: string;
  platforms: LatePlatform[];
  contentType: ContentManagerInput['contentType'];
  imagePrompt?: string;
  mediaUrl?: string;
  calendarEntryId: string;
  status: 'pending_approval' | 'scheduled' | 'draft';
};

export const CONTENT_MANAGER_PROMPT = `
You are the Content Manager Agent for TipRun. Oversee creation across Twitter, Instagram, and Telegram. Delegate image generation to Creatives Agent. Maintain brand voice and schedule content into the content calendar. Auto-publish only when explicitly requested.
`;

function pickHashtags(brief: string, platforms: LatePlatform[]): string[] {
  const tags: string[] = [];
  const b = brief.toLowerCase();
  if (b.includes('ipl') || b.includes('match')) tags.push('#IPL2026');
  if (b.includes('education') || b.includes('how')) tags.push('#CricketBasics');
  if (b.includes('tiprun')) tags.push('#TipRun');
  if (platforms.includes('twitter')) tags.push('#CricketTwitter');
  return Array.from(new Set(tags)).slice(0, platforms.includes('instagram') ? 8 : 2);
}

function ctaFor(platforms: LatePlatform[], contentType: ContentManagerInput['contentType']): string {
  if (contentType === 'story' || contentType === 'reel') return 'Join the waitlist at tiprun.io';
  if (platforms.includes('twitter')) return 'Trade your cricket conviction at tiprun.io';
  return 'Start predicting on tiprun.io';
}

function deriveTitle(content: string): string {
  const t = content.replace(/\s+/g, ' ').trim();
  return t.length <= 60 ? t : `${t.slice(0, 57)}...`;
}

function imageStyleFor(contentType: ContentManagerInput['contentType']): 'promotional' | 'educational' | 'meme' | 'announcement' {
  if (contentType === 'post' || contentType === 'thread') return 'promotional';
  if (contentType === 'story' || contentType === 'reel') return 'announcement';
  return 'promotional';
}

function imagePromptFromBrief(brief: string, contentType: ContentManagerInput['contentType']): string {
  const base = brief.trim();
  const style = imageStyleFor(contentType);
  if (style === 'educational') return `${base}, clean minimalist illustration with data elements, modern, vibrant`;
  if (style === 'announcement') return `${base}, sleek product visuals with dynamic lighting, modern, vibrant`;
  return `${base}, cricket stadium energy with digital trading overlays, modern, vibrant`;
}

class ContentManagerAgentImpl implements BaseAgent<ContentManagerInput, ContentManagerOutput> {
  id = 'content_manager';
  model = 'claude-3-5-sonnet';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: ContentManagerInput, ctx?: AgentContext): Promise<ContentManagerOutput> {
    try {
      await this.telemetry?.start(this.id, input, ctx);

      const hashtags = pickHashtags(input.brief, input.platforms);
      const cta = ctaFor(input.platforms, input.contentType);

      let content = '';
      if (input.contentType === 'thread') {
        const parts = [
          `${input.brief}`,
          'What is TipRun: a market to trade your cricket predictions',
          'How it works: take positions on match outcomes like stocks',
          `Get started: ${cta}`
        ];
        content = parts.join('\n\n');
      } else {
        content = `${input.brief}\n\n${cta}`;
      }

      if (input.platforms.includes('instagram')) {
        const igTags = hashtags.concat(['#Cricket', '#IPL']).slice(0, 10);
        content = `${content}\n\n${igTags.join(' ')}`;
      } else if (input.platforms.includes('twitter')) {
        const twTags = hashtags.slice(0, 2);
        if (twTags.length) content = `${content}\n${twTags.join(' ')}`;
      }

      let mediaUrl: string | undefined;
      let imagePrompt: string | undefined;
      if (input.includeImage) {
        imagePrompt = imagePromptFromBrief(input.brief, input.contentType);
        const platform = input.platforms.includes('instagram') ? 'instagram' : input.platforms[0];
        const gen = await CreativesAgent.generate({ prompt: imagePrompt, platform, style: imageStyleFor(input.contentType) });
        mediaUrl = gen.imageUrl;
      }

      const title = deriveTitle(content);
      const status: ContentManagerOutput['status'] = input.autoApprove ? 'scheduled' : 'pending_approval';

      const calendar = await db.contentCalendar.create({
        title,
        content,
        platform: input.platforms[0],
        contentType: input.contentType,
        status,
        scheduledFor: input.scheduledFor,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        campaignId: input.campaignId,
        createdBy: 'content_manager'
      });

      const out: ContentManagerOutput = {
        title,
        content,
        platforms: input.platforms,
        contentType: input.contentType,
        imagePrompt,
        mediaUrl,
        calendarEntryId: calendar.id,
        status
      };

      await this.telemetry?.end(this.id, out, ctx);
      return out;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const ContentManager = new ContentManagerAgentImpl();
export type ContentManagerType = ContentManagerAgentImpl;
