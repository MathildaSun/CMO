import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';
import { scrapeTweets, googleSearch } from '../lib/integrations/apify.js';

export type ResearchDepth = 'quick' | 'standard' | 'deep';

export type ResearchAgentInput = {
  topic: string;
  queries?: string[];
  competitors?: string[];
  includeTweets?: boolean;
  maxTweets?: number;
  depth?: ResearchDepth;
};

export type ResearchFinding = { finding: string; impact: 'high' | 'medium' | 'low'; actionRequired: boolean };
export type CompetitorUpdate = { competitor: string; update: string; ourResponse?: string };

export type ResearchReport = {
  topic: string;
  sources: string[];
  keyFindings: ResearchFinding[];
  competitorUpdates: CompetitorUpdate[];
  trendingTopics: string[];
  recommendations: string[];
  rawData?: Record<string, unknown>;
};

const DEFAULT_COMPETITORS = ['Dream11', 'MPL', 'Polymarket', 'Kalshi'];

function pickImpact(title: string): ResearchFinding['impact'] {
  const t = title.toLowerCase();
  if (t.includes('launch') || t.includes('funding') || t.includes('raise') || t.includes('partnership')) return 'high';
  if (t.includes('feature') || t.includes('update') || t.includes('campaign')) return 'medium';
  return 'low';
}

function extractHashtagsFromTweets(items: unknown[]): string[] {
  const counts: Record<string, number> = {};
  const re = /(^|\s)#([a-z0-9_]+)/gi;
  for (const it of items) {
    const rec = it as Record<string, unknown>;
    const raw = rec.text || rec.fullText || rec.content || '';
    const text = String(raw);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const tag = '#' + m[2].toLowerCase();
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);
}

class ResearchAgentImpl implements BaseAgent<ResearchAgentInput, ResearchReport> {
  id = 'research_agent';
  model = 'claude-3-5-sonnet';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: ResearchAgentInput, ctx?: AgentContext): Promise<ResearchReport> {
    try {
      await this.telemetry?.start(this.id, input, ctx);

      const competitors = input.competitors && input.competitors.length ? input.competitors : DEFAULT_COMPETITORS;
      const queries = input.queries && input.queries.length ? input.queries : [
        `${input.topic} IPL 2026`,
        ...competitors.map((c) => `${c} ${input.topic}`)
      ];

      const q = queries.join(' | ');
      const searchResults = await googleSearch({ queries: q, maxPages: input.depth === 'deep' ? 3 : input.depth === 'standard' ? 2 : 1, resultsPerPage: 10 });

      const sources: string[] = [];
      const keyFindings: ResearchFinding[] = [];
      const competitorUpdates: CompetitorUpdate[] = [];

      type SearchRecord = { url?: string; link?: string; finalUrl?: string; sourceUrl?: string; title?: string; heading?: string };
      for (const _r of (searchResults as unknown[]).slice(0, 20)) {
        const r = _r as SearchRecord;
        const url = (r.url || r.link || r.finalUrl || r.sourceUrl || '').toString();
        const title = (r.title || r.heading || '').toString();
        if (!url || !title) continue;
        sources.push(url);
        const impact = pickImpact(title);
        keyFindings.push({ finding: title, impact, actionRequired: impact !== 'low' });
        const comp = competitors.find((c) => title.toLowerCase().includes(c.toLowerCase()));
        if (comp) {
          competitorUpdates.push({ competitor: comp, update: title, ourResponse: impact === 'high' ? 'Assess and plan response content' : undefined });
        }
      }

      let trendingTopics: string[] = [];
      let tweetsRaw: unknown[] | undefined;
      if (input.includeTweets) {
        tweetsRaw = await scrapeTweets({ searchTerms: [input.topic, 'TipRun', '#IPL2026'], maxTweets: input.maxTweets || 50 });
        trendingTopics = extractHashtagsFromTweets(tweetsRaw);
      }

      const recommendations: string[] = [];
      const highImpact = keyFindings.filter((k) => k.impact === 'high');
      if (highImpact.length) recommendations.push('Create rapid response content addressing high-impact competitor/news updates');
      if (trendingTopics.length) recommendations.push(`Plan content around ${trendingTopics.slice(0, 3).join(', ')}`);
      if (!recommendations.length) recommendations.push('Maintain monitoring cadence and prepare weekly summary');

      const report: ResearchReport = {
        topic: input.topic,
        sources: Array.from(new Set(sources)).slice(0, 15),
        keyFindings: keyFindings.slice(0, 10),
        competitorUpdates: competitorUpdates.slice(0, 10),
        trendingTopics: trendingTopics.slice(0, 10),
        recommendations,
        rawData: tweetsRaw ? { tweetsSample: tweetsRaw.slice(0, 10) } : undefined
      };

      await this.telemetry?.end(this.id, report, ctx);
      return report;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const ResearchAgent = new ResearchAgentImpl();
export type ResearchAgentType = ResearchAgentImpl;
