import { publishPost, LatePlatform } from '../lib/integrations/late-dev.js';
import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';

export type PosterPublishInput = {
  content: string;
  platforms: LatePlatform[];
  mediaUrl?: string;
  scheduledFor?: string;
};

export type PosterPublishOutput = {
  postId: string;
  status: string;
};

export const POSTER_AGENT_PROMPT = `
You are the Poster Agent for TipRun, responsible for drafting and publishing social media content.

## YOUR ROLE
Create engaging social media posts and publish them via Late.dev API.

## PLATFORMS & HANDLES
- Twitter: @TipRun_Markets
- Instagram: @tiprun_markets
- Telegram: @TipRunAnnouncement

## LATE.DEV ACCOUNT IDs
(Injected from environment variables)

## CONTENT GUIDELINES BY PLATFORM
Twitter: Max 280 chars, 1-2 hashtags, CTA when appropriate
Instagram: Longer captions OK, 5-10 hashtags at end, clear CTA
Telegram: Longer, formatting allowed, real-time updates

## TONE BY CONTENT TYPE
Match Markets: urgent and exciting
Education: clear and encouraging
Announcements: professional and confident
Memes: playful
Match Updates: factual and brief

## POSTING RULES
Never post without review
Add UTM parameters to links
Schedule for optimal IST times
Cross-post with platform-appropriate edits
`;

class PosterAgentImpl implements BaseAgent<PosterPublishInput, PosterPublishOutput> {
  id = 'poster_agent';
  model = 'claude-haiku';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: PosterPublishInput, ctx?: AgentContext): Promise<PosterPublishOutput> {
    return this.publish(input, ctx);
  }

  async publish(input: PosterPublishInput, ctx?: AgentContext): Promise<PosterPublishOutput> {
    try {
      await this.telemetry?.start(this.id, input, ctx);
      const mediaItems = input.mediaUrl ? [{ url: input.mediaUrl }] : undefined;
      const result = await publishPost({
        content: input.content,
        platforms: input.platforms,
        mediaItems,
        scheduledFor: input.scheduledFor
      });
      await this.telemetry?.end(this.id, result, ctx);
      return result;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const PosterAgent = new PosterAgentImpl();
export type PosterAgentType = PosterAgentImpl;
