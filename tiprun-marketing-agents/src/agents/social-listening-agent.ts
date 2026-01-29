import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';

export type RawMention = {
  text?: string;
  fullText?: string;
  content?: string;
  author?: string;
  userScreenName?: string;
  authorUsername?: string;
  user?: { username?: string; followersCount?: number };
  userFollowersCount?: number;
  followersCount?: number;
  favoriteCount?: number;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  timestamp?: string;
  createdAt?: string;
};

export type SocialListeningInput = {
  brandMentions: RawMention[];
  competitorMentions: RawMention[];
  date: string; // YYYY-MM-DD
};

export type TopMention = {
  author: string;
  followers: number;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  engagement: number;
};

export type CompetitorActivity = {
  competitor: string;
  mentions: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  notableActivity?: string;
};

export type Alert = {
  type: 'influencer_mention' | 'negative_spike' | 'viral_potential';
  details: string;
  recommendedAction: string;
};

export type SocialListeningReport = {
  reportDate: string;
  brandMentions: { total: number; positive: number; neutral: number; negative: number };
  sentimentScore: number; // 0-10
  topMentions: TopMention[];
  competitorActivity: CompetitorActivity[];
  trendingTopics: string[];
  alerts: Alert[];
  recommendations: string[];
  fullReport?: string;
};

const POSITIVE_WORDS = [
  'love',
  'great',
  'awesome',
  'bullish',
  'cool',
  'amazing',
  'nice',
  'good',
  'impressive',
  'excited',
  'win',
  'fast',
  'smooth'
];

const NEGATIVE_WORDS = [
  'scam',
  'fraud',
  'avoid',
  'bad',
  'terrible',
  'hate',
  'worst',
  'lag',
  'broken',
  'issue',
  'problem',
  'bug',
  'down',
  'legal',
  'slow'
];

function getText(m: RawMention): string {
  return (m.text || m.fullText || m.content || '').toString();
}

function getAuthor(m: RawMention): string {
  return (
    m.authorUsername ||
    m.userScreenName ||
    m.author ||
    m.user?.username ||
    'unknown'
  );
}

function getFollowers(m: RawMention): number {
  return (
    m.userFollowersCount ||
    m.followersCount ||
    m.user?.followersCount ||
    0
  );
}

function engagementOf(m: RawMention): number {
  const likes = m.likeCount ?? m.favoriteCount ?? 0;
  const rts = m.retweetCount ?? 0;
  const replies = m.replyCount ?? 0;
  const quotes = m.quoteCount ?? 0;
  return likes + rts + replies + quotes;
}

function classifySentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const t = text.toLowerCase();
  const hasNeg = NEGATIVE_WORDS.some((w) => t.includes(w));
  if (hasNeg) return 'negative';
  const hasPos = POSITIVE_WORDS.some((w) => t.includes(w));
  if (hasPos) return 'positive';
  return 'neutral';
}

function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  const re = /(^|\s)#([a-z0-9_]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    tags.add('#' + m[2]);
  }
  return Array.from(tags);
}

const KNOWN_COMPETITORS = ['Dream11', 'MPL', 'Polymarket', 'Kalshi'];

class SocialListeningAgentImpl implements BaseAgent<SocialListeningInput, SocialListeningReport> {
  id = 'social_listening_agent';
  model = 'claude-haiku';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: SocialListeningInput, ctx?: AgentContext): Promise<SocialListeningReport> {
    return this.analyze(input, ctx);
  }

  async analyze(input: SocialListeningInput, ctx?: AgentContext): Promise<SocialListeningReport> {
    try {
      await this.telemetry?.start(this.id, input, ctx);

      const sentiments = { positive: 0, neutral: 0, negative: 0 };
      const topMentions: TopMention[] = [];
      const hashtagCounts: Record<string, number> = {};

      for (const m of input.brandMentions) {
        const text = getText(m);
        const s = classifySentiment(text);
        sentiments[s] += 1;
        const engagement = engagementOf(m);
        const tm: TopMention = {
          author: getAuthor(m),
          followers: getFollowers(m),
          content: text,
          sentiment: s,
          engagement
        };
        topMentions.push(tm);
        for (const tag of extractHashtags(text)) hashtagCounts[tag.toLowerCase()] = (hashtagCounts[tag.toLowerCase()] || 0) + 1;
      }

      topMentions.sort((a, b) => b.engagement - a.engagement || b.followers - a.followers);

      const total = input.brandMentions.length;
      const sentimentScore = total === 0 ? 5 : Math.max(0, Math.min(10, ((sentiments.positive - sentiments.negative) / total) * 10 + 5));

      const trendingTopics = Object.entries(hashtagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);

      const alerts: Alert[] = [];
      const influencer = topMentions.find((m) => m.followers >= 50000);
      if (influencer) {
        alerts.push({
          type: 'influencer_mention',
          details: `${influencer.author} mentioned the brand (followers: ${influencer.followers})`,
          recommendedAction: 'Engage with a personalized reply and consider outreach'
        });
      }
      if (sentiments.negative >= 3) {
        alerts.push({
          type: 'negative_spike',
          details: `Detected ${sentiments.negative} negative mentions today`,
          recommendedAction: 'Review negative posts and prepare a response if needed'
        });
      }
      const viral = topMentions.find((m) => m.engagement >= 100);
      if (viral) {
        alerts.push({
          type: 'viral_potential',
          details: `High engagement mention detected (engagement: ${viral.engagement})`,
          recommendedAction: 'Amplify with RT/quote and schedule supportive post'
        });
      }

      const competitorActivity: CompetitorActivity[] = [];
      for (const name of KNOWN_COMPETITORS) {
        const subset = input.competitorMentions.filter((m) => getText(m).toLowerCase().includes(name.toLowerCase()));
        if (subset.length === 0) continue;
        let pos = 0;
        let neg = 0;
        for (const m of subset) {
          const s = classifySentiment(getText(m));
          if (s === 'positive') pos += 1;
          else if (s === 'negative') neg += 1;
        }
        const mentions = subset.length;
        let sentiment: CompetitorActivity['sentiment'] = 'neutral';
        if (pos > 0 && neg > 0) sentiment = 'mixed';
        else if (pos > 0) sentiment = 'positive';
        else if (neg > 0) sentiment = 'negative';
        competitorActivity.push({ competitor: name, mentions, sentiment });
      }

      const recommendations: string[] = [];
      if (sentiments.negative > sentiments.positive) recommendations.push('Address negative feedback with clear, helpful responses');
      if (trendingTopics.length > 0) recommendations.push(`Create content around ${trendingTopics.slice(0, 2).join(', ')}`);
      if (influencer) recommendations.push('Prioritize outreach to recent influencer mention');

      const report: SocialListeningReport = {
        reportDate: input.date,
        brandMentions: { total: total, positive: sentiments.positive, neutral: sentiments.neutral, negative: sentiments.negative },
        sentimentScore: Number(sentimentScore.toFixed(1)),
        topMentions: topMentions.slice(0, 5),
        competitorActivity,
        trendingTopics,
        alerts,
        recommendations
      };

      await this.telemetry?.end(this.id, report, ctx);
      return report;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const SocialListeningAgent = new SocialListeningAgentImpl();
export type SocialListeningAgentType = SocialListeningAgentImpl;
