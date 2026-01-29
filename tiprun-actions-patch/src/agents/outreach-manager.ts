import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';
import { EmailAgent } from './email-agent.js';
import { db } from '../lib/database/index.js';
import { InfluencerAgent, type Influencer, type ProspectSearchCriteria } from './influencer-agent.js';

export type OutreachManagerInput = {
  influencerId?: string;
  searchCriteria?: ProspectSearchCriteria;
  autoSend?: boolean;
};

export type OutreachDraft = { subject: string; body: string };

export type OutreachManagerOutput =
  | { status: 'pending_approval'; approvalId: string; influencer: Influencer; outreach: OutreachDraft }
  | { status: 'sent'; influencer: Influencer; outreach: OutreachDraft; emailId: string };

class OutreachManagerImpl implements BaseAgent<OutreachManagerInput, OutreachManagerOutput> {
  id = 'outreach_manager';
  model = 'claude-3-5-sonnet';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: OutreachManagerInput, ctx?: AgentContext): Promise<OutreachManagerOutput> {
    try {
      await this.telemetry?.start(this.id, input, ctx);
      let influencer: Influencer | undefined;
      if (input.influencerId) {
        influencer = (await db.influencers.getById(input.influencerId)) as unknown as Influencer;
      } else if (input.searchCriteria) {
        const prospects = (await InfluencerAgent.findProspects(input.searchCriteria)) as Influencer[];
        influencer = prospects[0];
        if (influencer) {
          const created = await db.influencers.create({
            name: influencer.name,
            handle: influencer.handle,
            platform: influencer.platform,
            followers: influencer.followers,
            tier: influencer.tier,
            niche: influencer.niche,
            engagementRate: influencer.engagementRate,
            rateInr: influencer.estimatedRate,
            notes: influencer.recentContent
          });
          influencer = { ...influencer, id: created.id } as Influencer & { id: string };
        }
      }
      if (!influencer) throw new Error('No influencer found');

      const research = await InfluencerAgent.research(influencer.handle, influencer.platform);
      const outreach = await InfluencerAgent.draftOutreach(influencer, research);

      if (!input.autoSend) {
        const approval = await db.approvalQueue.create({
          requestType: 'outreach',
          requestedBy: 'influencer_agent',
          title: `Outreach to ${influencer.name} (${influencer.handle})`,
          details: {
            to: influencer.contactEmail || '',
            subject: outreach.subject,
            body: outreach.body,
            influencerId: (influencer as unknown as { id?: string }).id || undefined
          },
          status: 'pending'
        });
        const out = { status: 'pending_approval', approvalId: approval.id, influencer, outreach } as const;
        await this.telemetry?.end(this.id, out, ctx);
        return out;
      }

      if (!influencer.contactEmail) throw new Error('Cannot auto-send without contact email');
      const emailRes = await EmailAgent.sendOutreach({ kind: 'outreach', to: influencer.contactEmail, subject: outreach.subject, body: outreach.body });
      await db.influencers.update((influencer as unknown as { id: string }).id, { status: 'contacted', lastContactedAt: new Date().toISOString() });
      const out = { status: 'sent', influencer, outreach, emailId: emailRes.id } as const;
      await this.telemetry?.end(this.id, out, ctx);
      return out;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const OutreachManager = new OutreachManagerImpl();
export type OutreachManagerType = OutreachManagerImpl;
