import { db } from './database/index.js';
import { sendMessage } from './integrations/slack.js';
import { PosterAgent } from '../agents/poster-agent.js';
import { EmailAgent } from '../agents/email-agent.js';
import type { LatePlatform } from './integrations/late-dev.js';

function nowIso() {
  return new Date().toISOString();
}

function toLatePlatforms(input: unknown): LatePlatform[] {
  const allowed: LatePlatform[] = ['twitter', 'instagram', 'telegram'];
  if (Array.isArray(input)) {
    return input.filter((p): p is LatePlatform => allowed.includes(p as LatePlatform));
  }
  return [];
}

export async function handleApproval(approvalId: string, approved: boolean, approvedBy: string) {
  const approval = await db.approvalQueue.getById(approvalId);
  if (!approval || approval.status !== 'pending') {
    throw new Error('Invalid or already processed approval');
  }

  await db.approvalQueue.update(approvalId, {
    status: approved ? 'approved' : 'rejected',
    approvedBy,
    approvedAt: nowIso()
  });

  if (!approved) {
    await sendMessage({ channel: 'updates', text: `❌ ${approval.title} was rejected by ${approvedBy}` });
    return { status: 'rejected' as const };
  }

  switch (approval.request_type) {
    case 'content': {
      const details = approval.details as Record<string, unknown>;
      const calendarEntryId = details.calendarEntryId as string;
      const content = await db.contentCalendar.getById(calendarEntryId);
      const mediaUrl = (content.mediaUrls && content.mediaUrls[0]) || (details.mediaUrl as string | undefined);
      const platforms = toLatePlatforms(details.platforms);
      const finalPlatforms = platforms.length ? platforms : toLatePlatforms([content.platform]);

      const publishResult = await PosterAgent.publish({
        content: content.content,
        platforms: finalPlatforms,
        mediaUrl
      });

      await db.contentCalendar.update(content.id, {
        status: 'published',
        publishedAt: nowIso(),
        lateDevPostId: publishResult.postId,
        approvedBy
      });
      break;
    }
    case 'outreach': {
      const details = approval.details as Record<string, unknown>;
      const to = (details.to as string) || '';
      const subject = (details.subject as string) || '';
      const body = (details.body as string) || '';
      if (!to || !subject || !body) throw new Error('Outreach approval missing required fields');

      await EmailAgent.sendOutreach({ kind: 'outreach', to, subject, body });

      const influencerId = details.influencerId as string | undefined;
      if (influencerId) {
        await db.influencers.update(influencerId, { status: 'contacted', lastContactedAt: nowIso() });
      }
      break;
    }
    case 'email': {
      const details = approval.details as Record<string, unknown>;
      const to = (details.to as string[]) || [];
      const subject = (details.subject as string) || '';
      const html = (details.html as string) || '';
      const text = details.text as string | undefined;
      const from = details.from as string | undefined;
      const scheduledAt = details.scheduledAt as string | undefined;
      if (!to.length || !subject || !html) throw new Error('Email approval missing required fields');

      await EmailAgent.sendCampaign({ kind: 'campaign', to, subject, html, text, from, scheduledAt });
      break;
    }
    default: {
      break;
    }
  }

  await sendMessage({ channel: 'updates', text: `✅ ${approval.title} was approved by ${approvedBy} and executed` });

  return { status: 'approved' as const, executed: true };
}
