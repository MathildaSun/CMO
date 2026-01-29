import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory fakes
const store: Record<string, any> = {
  approvals: {},
  calendar: {}
};

vi.mock('../../src/lib/database/index.js', () => {
  return {
    db: {
      approvalQueue: {
        async getById(id: string) {
          return store.approvals[id] || null;
        },
        async update(id: string, patch: Record<string, unknown>) {
          Object.assign(store.approvals[id], patch);
          return store.approvals[id];
        }
      },
      contentCalendar: {
        async getById(id: string) {
          return store.calendar[id] || null;
        },
        async update(id: string, patch: Record<string, unknown>) {
          Object.assign(store.calendar[id], patch);
          return store.calendar[id];
        }
      },
      influencers: {
        async update() { /* noop for this test */ }
      },
      emailLog: {
        async create() { /* noop for this test */ }
      }
    }
  };
});

vi.mock('../../src/agents/poster-agent.js', () => ({
  PosterAgent: {
    publish: vi.fn(async () => ({ postId: 'post_abc', status: 'published' }))
  }
}));

vi.mock('../../src/agents/email-agent.js', () => ({
  EmailAgent: {
    sendOutreach: vi.fn(async () => ({ id: 'email_1' })),
    sendCampaign: vi.fn(async () => ({ id: 'email_2' }))
  }
}));

const sentMessages: string[] = [];
vi.mock('../../src/lib/integrations/slack.js', () => ({
  sendMessage: vi.fn(async ({ text }: { text: string }) => {
    sentMessages.push(text);
    return { ts: '1' };
  })
}));

import { handleApproval } from '../../src/lib/approval.ts';
import { PosterAgent } from '../../src/agents/poster-agent.ts';

describe('handleApproval', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    store.approvals = {};
    store.calendar = {};
  });

  it('publishes approved content and updates calendar', async () => {
    const calId = 'cal_1';
    store.calendar[calId] = { id: calId, content: 'Post body', platform: 'twitter', mediaUrls: ['https://img.png'] };
    const approvalId = 'app_1';
    store.approvals[approvalId] = {
      id: approvalId,
      status: 'pending',
      title: 'Test Content',
      request_type: 'content',
      details: { calendarEntryId: calId, platforms: ['twitter'] }
    };

    const out = await handleApproval(approvalId, true, 'tester');
    expect(out.status).toBe('approved');
    expect(out.executed).toBe(true);
    expect((PosterAgent.publish as any).mock.calls.length).toBe(1);
    expect(store.calendar[calId].status).toBe('published');
    expect(store.calendar[calId].lateDevPostId).toBe('post_abc');
    expect(sentMessages.some((m) => m.includes('approved by tester'))).toBe(true);
  });

  it('marks as rejected and sends update when not approved', async () => {
    const approvalId = 'app_2';
    store.approvals[approvalId] = { id: approvalId, status: 'pending', title: 'Reject Me', request_type: 'content', details: { calendarEntryId: 'x' } };
    const out = await handleApproval(approvalId, false, 'tester');
    expect(out.status).toBe('rejected');
    expect(sentMessages.some((m) => m.includes('was rejected'))).toBe(true);
  });
});
