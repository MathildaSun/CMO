import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';
import { scrapeTweets } from '../lib/integrations/apify.js';

export type ProspectSearchCriteria = {
  platform: 'twitter' | 'instagram' | 'youtube';
  minFollowers: number;
  niche: string[];
};

export type Influencer = {
  name: string;
  handle: string;
  platform: 'twitter' | 'instagram' | 'youtube';
  followers?: number;
  tier?: 'nano' | 'micro' | 'mid' | 'macro';
  niche?: string[];
  engagementRate?: number;
  recentContent?: string;
  fitScore?: number;
  estimatedRate?: string;
  outreachAngle?: string;
  contactEmail?: string;
};

export type InfluencerResearchInput = { kind: 'research'; handle: string; platform: Influencer['platform'] };
export type InfluencerFindInput = { kind: 'find'; criteria: ProspectSearchCriteria };
export type InfluencerDraftInput = { kind: 'draft_outreach'; influencer: Influencer; research?: { recentContent?: string; engagementRate?: number } };

export type InfluencerAgentInput = InfluencerResearchInput | InfluencerFindInput | InfluencerDraftInput;

export type InfluencerFindOutput = Influencer[];
export type InfluencerResearchOutput = { recentContent?: string; engagementRate?: number };
export type InfluencerDraftOutput = { subject: string; body: string };

function tierForFollowers(f: number): Influencer['tier'] {
  if (f >= 200000) return 'macro';
  if (f >= 50000) return 'mid';
  if (f >= 15000) return 'micro';
  return 'nano';
}

function estimatedRateForTier(tier?: Influencer['tier']): string | undefined {
  if (tier === 'nano') return '₹5,000-15,000';
  if (tier === 'micro') return '₹15,000-50,000';
  if (tier === 'mid') return '₹50,000-2,00,000';
  if (tier === 'macro') return '₹2,00,000-10,00,000';
  return undefined;
}

function computeEngagementRate(engagement: number, followers?: number): number | undefined {
  if (!followers || followers <= 0) return undefined;
  return Number(((engagement / followers) * 100).toFixed(2));
}

function fitScoreFrom(texts: string[], niche: string[]): number {
  const pool = texts.join(' ').toLowerCase();
  let score = 0;
  for (const n of niche) if (pool.includes(n.toLowerCase())) score += 2;
  if (/#ipl/.test(pool)) score += 2;
  if (/cricket/.test(pool)) score += 2;
  return Math.min(10, Math.max(1, score));
}

function outreachAngleFor(inf: Influencer): string {
  const parts: string[] = [];
  if (inf.niche?.includes('cricket')) parts.push('align with your cricket-first audience');
  if (inf.niche?.includes('fantasy')) parts.push('bridge fantasy insights to market-style trading');
  if ((inf.followers || 0) > 50000) parts.push('amplify during IPL prime-time slots');
  if (!parts.length) parts.push('collaborate on IPL 2026 market previews');
  return parts.join('; ');
}

type AnyTweet = Record<string, unknown>;

function extractAuthorUsername(t: AnyTweet): string | undefined {
  const a = t.authorUsername as string | undefined;
  if (a) return a;
  const b = t.userScreenName as string | undefined;
  if (b) return b;
  const c = t.author as string | undefined;
  if (c) return c;
  const u = t.user as Record<string, unknown> | undefined;
  const d = u && typeof (u as Record<string, unknown>).username === 'string' ? ((u as Record<string, unknown>).username as string) : undefined;
  return d;
}

function extractFollowers(t: AnyTweet): number {
  return (
    (t.userFollowersCount as number | undefined) ||
    (t.followersCount as number | undefined) ||
    ((t.user as Record<string, unknown> | undefined)?.followersCount as number | undefined) ||
    0
  );
}

function extractEngagement(t: AnyTweet): number {
  const likes = (t.likeCount as number | undefined) ?? (t.favoriteCount as number | undefined) ?? 0;
  const rts = (t.retweetCount as number | undefined) ?? 0;
  const replies = (t.replyCount as number | undefined) ?? 0;
  const quotes = (t.quoteCount as number | undefined) ?? 0;
  return likes + rts + replies + quotes;
}

class InfluencerAgentImpl implements BaseAgent<InfluencerAgentInput, unknown> {
  id = 'influencer_agent';
  model = 'claude-haiku';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: InfluencerAgentInput, ctx?: AgentContext): Promise<unknown> {
    if (input.kind === 'find') return this.findProspects(input.criteria, ctx);
    if (input.kind === 'research') return this.research(input.handle, input.platform, ctx);
    return this.draftOutreach(input.influencer, input.research, ctx);
  }

  async findProspects(criteria: ProspectSearchCriteria, ctx?: AgentContext): Promise<InfluencerFindOutput> {
    try {
      await this.telemetry?.start(this.id, criteria, ctx);
      const terms = [
        '#IPL2026',
        'cricket',
        ...criteria.niche.slice(0, 3)
      ];
      const items = criteria.platform === 'twitter' ? await scrapeTweets({ searchTerms: terms, maxTweets: 100, onlyVerifiedUsers: false, sort: 'Top' }) : [];
      const byUser: Record<string, { followers: number; engagement: number; samples: string[] }> = {};
      for (const it of items as AnyTweet[]) {
        const user = extractAuthorUsername(it);
        if (!user) continue;
        const f = extractFollowers(it);
        if (f < criteria.minFollowers) continue;
        const e = extractEngagement(it);
        const text = (it.text as string | undefined) || (it.fullText as string | undefined) || (it.content as string | undefined) || '';
        if (!byUser[user]) byUser[user] = { followers: f, engagement: 0, samples: [] };
        byUser[user].followers = Math.max(byUser[user].followers, f);
        byUser[user].engagement += e;
        if (text) byUser[user].samples.push(text);
      }
      const prospects: Influencer[] = Object.entries(byUser).map(([handle, stats]) => {
        const followers = stats.followers;
        const tier = tierForFollowers(followers);
        const engagementRate = computeEngagementRate(stats.engagement, followers);
        const fitScore = fitScoreFrom(stats.samples.slice(0, 5), criteria.niche);
        return {
          name: handle,
          handle: `@${handle}`,
          platform: criteria.platform,
          followers,
          tier,
          niche: criteria.niche,
          engagementRate,
          recentContent: stats.samples[0],
          fitScore,
          estimatedRate: estimatedRateForTier(tier),
          outreachAngle: ''
        };
      })
        .sort((a, b) => (b.followers || 0) - (a.followers || 0) || (b.engagementRate || 0) - (a.engagementRate || 0))
        .slice(0, 10);
      for (const p of prospects) p.outreachAngle = outreachAngleFor(p);
      await this.telemetry?.end(this.id, prospects, ctx);
      return prospects;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }

  async research(handle: string, platform: Influencer['platform'], ctx?: AgentContext): Promise<InfluencerResearchOutput> {
    try {
      await this.telemetry?.start(this.id, { handle, platform }, ctx);
      if (platform !== 'twitter') {
        const res = { recentContent: undefined, engagementRate: undefined } as InfluencerResearchOutput;
        await this.telemetry?.end(this.id, res, ctx);
        return res;
      }
      const items = (await scrapeTweets({ searchTerms: [handle, handle.replace(/^@/, '')], maxTweets: 20, sort: 'Latest' })) as AnyTweet[];
      let engagement = 0;
      let followers = 0;
      let sample = '';
      for (const it of items) {
        engagement += extractEngagement(it);
        followers = Math.max(followers, extractFollowers(it));
        const text = (it.text as string | undefined) || (it.fullText as string | undefined) || (it.content as string | undefined) || '';
        if (!sample && text) sample = text;
      }
      const engagementRate = computeEngagementRate(engagement, followers);
      const out = { recentContent: sample, engagementRate } as InfluencerResearchOutput;
      await this.telemetry?.end(this.id, out, ctx);
      return out;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }

  async draftOutreach(influencer: Influencer, research?: InfluencerResearchOutput, ctx?: AgentContext): Promise<InfluencerDraftOutput> {
    try {
      await this.telemetry?.start(this.id, { influencer, research }, ctx);
      const subject = `Collab for IPL 2026? Loved your recent post`;
      const openingRef = research?.recentContent ? `Loved your take: “${research.recentContent.slice(0, 80)}”` : `Loved your recent content`;
      const value = `TipRun lets fans trade their cricket predictions like positions in markets. No house edge, just conviction.`;
      const angle = influencer.outreachAngle || outreachAngleFor(influencer);
      const body = [
        `Hi ${influencer.name},`,
        '',
        `${openingRef}. We think your audience would enjoy a fresh way to act on match conviction during IPL 2026.`,
        '',
        value,
        '',
        `Idea: ${angle}. Deliverables could be a match preview post + brief explainer.`,
        '',
        `Happy to keep it simple. Typical compensation for your tier: ${influencer.estimatedRate || estimatedRateForTier(influencer.tier)}.`,
        '',
        'If this sparks interest, can we set up a 15-min chat this week?',
        '',
        '— Team TipRun'
      ].join('\n');
      const out = { subject, body } as InfluencerDraftOutput;
      await this.telemetry?.end(this.id, out, ctx);
      return out;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const InfluencerAgent = new InfluencerAgentImpl();
export type InfluencerAgentType = InfluencerAgentImpl;
