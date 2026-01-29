import { describe, it, expect, vi } from 'vitest';

type LatePublishArgs = {
  content: string;
  platforms: string[];
  mediaItems?: { url: string }[];
  scheduledFor?: string;
};

vi.mock('../../src/lib/integrations/late-dev.js', () => {
  return {
    publishPost: vi.fn(async (args: LatePublishArgs) => {
      return { postId: 'post_123', status: args.scheduledFor ? 'scheduled' : 'published' };
    })
  };
});

import { PosterAgent } from '../../src/agents/poster-agent.ts';
import * as lateDev from '../../src/lib/integrations/late-dev.js';

describe('PosterAgent', () => {
  it('publishes immediately without schedule and without media', async () => {
    const out = await PosterAgent.publish({
      content: 'Hello TipRun',
      platforms: ['twitter']
    });
    expect(out.postId).toBe('post_123');
    expect(out.status).toBe('published');
    const calls = (lateDev.publishPost as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toMatchObject({ content: 'Hello TipRun', platforms: ['twitter'] });
    expect(calls[0][0].mediaItems).toBeUndefined();
  });

  it('schedules publish with media', async () => {
    const out = await PosterAgent.publish({
      content: 'With media',
      platforms: ['instagram', 'telegram'],
      mediaUrl: 'https://example.com/image.png',
      scheduledFor: '2026-03-01T12:00:00Z'
    });
    expect(out.status).toBe('scheduled');
    const calls = (lateDev.publishPost as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls[calls.length - 1][0]).toMatchObject({
      mediaItems: [{ url: 'https://example.com/image.png' }],
      scheduledFor: '2026-03-01T12:00:00Z'
    });
  });
});
