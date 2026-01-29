import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/agents/content-manager.js', () => ({
  ContentManager: {
    process: vi.fn(async () => ({
      calendarEntryId: 'cal_42',
      content: 'Draft content for post',
      mediaUrl: 'https://image.example/promo.png'
    }))
  }
}));

const createdApprovals: any[] = [];
vi.mock('../../src/lib/database/index.js', () => ({
  db: {
    approvalQueue: {
      async create(payload: any) {
        createdApprovals.push(payload);
        return { id: 'app_99', ...payload };
      }
    },
    contentCalendar: {
      async update() { /* not hit in this test */ }
    }
  }
}));

const approvalsSent: any[] = [];
vi.mock('../../src/lib/integrations/slack.js', () => ({
  sendApprovalRequest: vi.fn(async (args: any) => {
    approvalsSent.push(args);
    return { ts: '123.456' };
  })
}));

import { createAndPublishContent } from '../../src/workflows/content-publishing.ts';

describe('createAndPublishContent', () => {
  beforeEach(() => {
    createdApprovals.length = 0;
    approvalsSent.length = 0;
  });

  it('queues approval when autoApprove is false', async () => {
    const out = await createAndPublishContent({
      brief: 'Announce feature',
      platforms: ['twitter'],
      contentType: 'post',
      includeImage: true,
      autoApprove: false
    });

    expect(out.status).toBe('pending_approval');
    expect(out.calendarEntryId).toBe('cal_42');
    expect(createdApprovals.length).toBe(1);
    expect(approvalsSent.length).toBe(1);
  });
});
