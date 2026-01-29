import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';
import { sendMessage, sendApprovalRequest } from '../lib/integrations/slack.js';

export type OpsNotifyInput = {
  kind: 'notify';
  channel: 'alerts' | 'updates' | 'wins';
  text: string;
};

export type OpsApprovalInput = {
  kind: 'approval';
  title: string;
  details: string;
  requestedBy: string;
  approvalId: string;
};

export type OpsAlertInput = {
  kind: 'alert';
  title: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
  recommendedAction?: string;
};

export type OpsDailySummaryInput = {
  kind: 'daily_summary';
  date: string;
  contentPublished: number;
  engagement: string;
  topPerformer: string;
  upcoming: string;
  actionItems: string[];
};

export type OperationsAgentInput = OpsNotifyInput | OpsApprovalInput | OpsAlertInput | OpsDailySummaryInput;

export type OperationsAgentOutput = { ok: true; ts?: string };

class OperationsAgentImpl implements BaseAgent<OperationsAgentInput, OperationsAgentOutput> {
  id = 'operations_agent';
  model = 'claude-haiku';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: OperationsAgentInput, ctx?: AgentContext): Promise<OperationsAgentOutput> {
    try {
      await this.telemetry?.start(this.id, input, ctx);
      let ts: string | undefined;

      if (input.kind === 'notify') {
        const res = await sendMessage({ channel: input.channel, text: input.text });
        ts = res.ts;
      } else if (input.kind === 'approval') {
        const res = await sendApprovalRequest({ title: input.title, details: input.details, requestedBy: input.requestedBy, approvalId: input.approvalId });
        ts = res.ts;
      } else if (input.kind === 'alert') {
        const msg = `⚠️ Alert: ${input.title}\nSeverity: ${input.severity}\n${input.details}${input.recommendedAction ? `\nRecommended: ${input.recommendedAction}` : ''}`;
        const res = await sendMessage({ channel: 'alerts', text: msg });
        ts = res.ts;
      } else if (input.kind === 'daily_summary') {
        const msg = `📊 Daily Marketing Summary - ${input.date}\n\nContent Published: ${input.contentPublished}\nEngagement: ${input.engagement}\nTop Performer: ${input.topPerformer}\n\nUpcoming: ${input.upcoming}\nAction Items: ${input.actionItems.join(', ')}`;
        const res = await sendMessage({ channel: 'updates', text: msg });
        ts = res.ts;
      }

      const out: OperationsAgentOutput = { ok: true, ts };
      await this.telemetry?.end(this.id, out, ctx);
      return out;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const OperationsAgent = new OperationsAgentImpl();
export type OperationsAgentType = OperationsAgentImpl;
