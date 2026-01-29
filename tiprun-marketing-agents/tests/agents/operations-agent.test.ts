import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/integrations/slack.ts', () => ({
  sendMessage: async () => ({ ts: '123.456' }),
  sendApprovalRequest: async () => ({ ts: '111.111' })
}));

import { OperationsAgent } from '../../src/agents/operations-agent.ts';

describe('OperationsAgent', () => {
  it('sends alerts to Slack', async () => {
    const out = await OperationsAgent.process({ kind: 'alert', title: 'Negative spike', severity: 'high', details: '5 negative mentions in 1h', recommendedAction: 'Prepare response' });
    expect(out.ok).toBe(true);
    expect(out.ts).toBeDefined();
  });

  it('sends daily summary to updates channel', async () => {
    const out = await OperationsAgent.process({ kind: 'daily_summary', date: '2026-01-28', contentPublished: 3, engagement: '1.2k likes, 300 RTs', topPerformer: 'Tweet ABC', upcoming: '2 posts scheduled', actionItems: ['Review comments'] });
    expect(out.ok).toBe(true);
    expect(out.ts).toBeDefined();
  });

  it('sends approval requests', async () => {
    const out = await OperationsAgent.process({ kind: 'approval', title: 'Publish content', details: 'New post for Twitter', requestedBy: 'Content Manager', approvalId: 'appr_1' });
    expect(out.ok).toBe(true);
    expect(out.ts).toBe('111.111');
  });
});
