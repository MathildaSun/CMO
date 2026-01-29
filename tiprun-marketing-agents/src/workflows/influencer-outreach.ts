import { InfluencerAgent, type Influencer } from '../agents/influencer-agent.js';
import { EmailAgent } from '../agents/email-agent.js';
import { db } from '../lib/database/index.js';
import { sendApprovalRequest } from '../lib/integrations/slack.js';

export async function conductInfluencerOutreach(params: {
  influencerId?: string;
  searchCriteria?: {
    platform: 'twitter' | 'instagram' | 'youtube';
    minFollowers: number;
    niche: string[];
  };
  autoSend?: boolean;
}) {
  type StoredInfluencer = {
    id: string;
    name: string;
    handle: string;
    platform: 'twitter' | 'instagram' | 'youtube';
    followers?: number;
    tier?: 'nano' | 'micro' | 'mid' | 'macro';
    niche?: string[];
    engagementRate?: number;
    contactEmail?: string;
    rateInr?: string;
    notes?: string;
  };

  let influencer: StoredInfluencer | undefined;

  if (params.influencerId) {
    influencer = (await db.influencers.getById(params.influencerId)) as unknown as StoredInfluencer;
  } else if (params.searchCriteria) {
    const prospects = (await InfluencerAgent.findProspects(params.searchCriteria)) as Influencer[];
    const first = prospects[0];
    if (!first) throw new Error('No influencer found from search criteria');
    const created = await db.influencers.create({
      name: first.name,
      handle: first.handle,
      platform: first.platform,
      followers: first.followers,
      tier: first.tier,
      niche: first.niche,
      engagementRate: first.engagementRate,
      rateInr: first.estimatedRate,
      notes: first.outreachAngle
    });
    influencer = created as unknown as StoredInfluencer;
  }

  if (!influencer) throw new Error('No influencer found');

  const research = await InfluencerAgent.research(influencer.handle, influencer.platform);
  const outreach = await InfluencerAgent.draftOutreach(influencer as unknown as Influencer, research);

  if (!params.autoSend) {
    const approval = await db.approvalQueue.create({
      requestType: 'outreach',
      requestedBy: 'influencer_agent',
      title: `Outreach to ${influencer.name} (${influencer.handle})`,
      details: {
        to: influencer.contactEmail,
        subject: outreach.subject,
        body: outreach.body,
        influencerId: influencer.id
      }
    });

    await sendApprovalRequest({
      title: `Influencer Outreach: ${influencer.name}`,
      details: `Subject: ${outreach.subject}\n\nTo: ${influencer.contactEmail || '(no email)'}\n\n${outreach.body.slice(0, 500)}${outreach.body.length > 500 ? '…' : ''}`,
      requestedBy: 'Influencer Agent',
      approvalId: approval.id
    });

    return {
      status: 'pending_approval' as const,
      approvalId: approval.id,
      influencer,
      outreach
    };
  }

  if (!influencer.contactEmail) throw new Error('Influencer has no contact email');
  const emailRes = await EmailAgent.sendOutreach({ kind: 'outreach', to: influencer.contactEmail, subject: outreach.subject, body: outreach.body });

  await db.influencers.update(influencer.id, { status: 'contacted', lastContactedAt: new Date().toISOString() });

  return { status: 'sent' as const, influencer, outreach, emailId: emailRes.id };
}
