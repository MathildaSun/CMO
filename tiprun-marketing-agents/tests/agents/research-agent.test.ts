import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/integrations/apify.ts', () => ({
  scrapeTweets: async () => ([
    { text: 'Excited for #IPL2026 and TipRun launch!' },
    { text: 'Dream11 new feature announced #IPL2026' },
    { text: 'Polymarket cricket markets heating up #Cricket' }
  ]),
  googleSearch: async () => ([
    { title: 'Dream11 launches live trading feature for IPL 2026', url: 'https://news.example.com/dream11-feature' },
    { title: 'MPL partners with league for promotion', url: 'https://news.example.com/mpl-partnership' },
    { title: 'What is TipRun prediction markets', url: 'https://blog.example.com/tiprun-explainer' }
  ])
}));

import { ResearchAgent } from '../../src/agents/research-agent.ts';

describe('ResearchAgent', () => {
  it('produces a research report with findings, competitor updates, and trends', async () => {
    const out = await ResearchAgent.process({ topic: 'cricket prediction market', includeTweets: true, depth: 'quick' });

    expect(out.topic).toMatch(/cricket prediction market/);
    expect(out.sources.length).toBeGreaterThan(0);
    expect(out.keyFindings.length).toBeGreaterThan(0);
    expect(out.trendingTopics).toContain('#ipl2026');

    const comps = out.competitorUpdates.map((c) => c.competitor);
    expect(comps).toContain('Dream11');

    const anyHigh = out.keyFindings.some((k) => k.impact === 'high');
    expect(anyHigh).toBe(true);

    expect(out.recommendations.length).toBeGreaterThan(0);
  });
});
