import { describe, it, expect } from 'vitest';
import { SocialListeningAgent } from '../../src/agents/social-listening-agent.ts';
import type { RawMention } from '../../src/agents/social-listening-agent.ts';

const mk = (m: Partial<RawMention>): RawMention => (m as RawMention);

describe('SocialListeningAgent', () => {
  it('analyzes mentions and produces deterministic report', async () => {
    const brandMentions = [
      mk({ text: 'TipRun is awesome! #IPL2026 #CricketTwitter', authorUsername: '@fan1', userFollowersCount: 1200, likeCount: 10, retweetCount: 2, replyCount: 1 }),
      mk({ text: 'Facing an issue with login on tiprun.io', authorUsername: '@user2', userFollowersCount: 300, likeCount: 1, retweetCount: 0, replyCount: 0 }),
      mk({ text: 'Trying TipRun today. Looks interesting. #IPL2026', authorUsername: '@user3', userFollowersCount: 800, likeCount: 5, retweetCount: 1, replyCount: 0 }),
      mk({ text: 'Shoutout TipRun! smooth experience so far', authorUsername: '@influencer', userFollowersCount: 75000, likeCount: 80, retweetCount: 30, replyCount: 5 })
    ];

    const competitorMentions = [
      mk({ text: 'Dream11 new feature announced for #IPL2026', likeCount: 3 }),
      mk({ text: 'Polymarket cricket markets look great', likeCount: 2 }),
      mk({ text: 'MPL app down again, terrible', likeCount: 1 })
    ];

    const out = await SocialListeningAgent.process({ brandMentions, competitorMentions, date: '2026-01-28' });

    expect(out.reportDate).toBe('2026-01-28');
    expect(out.brandMentions.total).toBe(4);
    expect(out.brandMentions.positive).toBeGreaterThanOrEqual(2);
    expect(out.brandMentions.negative).toBe(1);
    expect(out.trendingTopics).toContain('#ipl2026');

    expect(out.topMentions.length).toBeGreaterThan(0);
    const top = out.topMentions[0];
    expect(top.engagement).toBeGreaterThanOrEqual(100);

    const types = out.alerts.map((a) => a.type);
    expect(types).toContain('influencer_mention');
    expect(types).toContain('viral_potential');

    const comps = out.competitorActivity.reduce<Record<string, number>>((acc, c) => { acc[c.competitor] = c.mentions; return acc; }, {});
    expect(comps['Dream11']).toBe(1);
  });
});
