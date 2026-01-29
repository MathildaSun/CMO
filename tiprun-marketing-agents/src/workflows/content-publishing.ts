import { ContentManager } from '../agents/content-manager.js';
import { PosterAgent } from '../agents/poster-agent.js';
import { db } from '../lib/database/index.js';
import { sendApprovalRequest } from '../lib/integrations/slack.js';
import type { LatePlatform } from '../lib/integrations/late-dev.js';

export async function createAndPublishContent(params: {
  brief: string;
  platforms: LatePlatform[];
  contentType: 'post' | 'thread' | 'story' | 'reel' | 'video';
  includeImage: boolean;
  scheduledFor?: string;
  campaignId?: string;
  autoApprove?: boolean;
}) {
  const contentResult = await ContentManager.process({
    task: `Create ${params.contentType} content for ${params.platforms.join(', ')}`,
    brief: params.brief,
    platforms: params.platforms,
    contentType: params.contentType,
    includeImage: params.includeImage,
    scheduledFor: params.scheduledFor,
    campaignId: params.campaignId,
    autoApprove: params.autoApprove
  });

  if (!params.autoApprove) {
    const approval = await db.approvalQueue.create({
      requestType: 'content',
      requestedBy: 'content_manager',
      title: `New ${params.contentType} for ${params.platforms.join(', ')}`,
      details: {
        calendarEntryId: contentResult.calendarEntryId,
        content: contentResult.content,
        mediaUrl: contentResult.mediaUrl,
        platforms: params.platforms,
        scheduledFor: params.scheduledFor
      }
    });

    await sendApprovalRequest({
      title: `New ${params.contentType} for ${params.platforms.join(', ')}`,
      details: `${contentResult.content.slice(0, 280)}${contentResult.content.length > 280 ? '…' : ''}`,
      requestedBy: 'Content Manager',
      approvalId: approval.id
    });

    return {
      status: 'pending_approval' as const,
      calendarEntryId: contentResult.calendarEntryId,
      content: contentResult.content,
      mediaUrl: contentResult.mediaUrl
    };
  }

  const publishResult = await PosterAgent.publish({
    content: contentResult.content,
    platforms: params.platforms,
    mediaUrl: contentResult.mediaUrl,
    scheduledFor: params.scheduledFor
  });

  await db.contentCalendar.update(contentResult.calendarEntryId, {
    status: 'scheduled',
    lateDevPostId: publishResult.postId
  });

  return {
    status: 'scheduled' as const,
    calendarEntryId: contentResult.calendarEntryId,
    postId: publishResult.postId,
    content: contentResult.content,
    mediaUrl: contentResult.mediaUrl
  };
}
