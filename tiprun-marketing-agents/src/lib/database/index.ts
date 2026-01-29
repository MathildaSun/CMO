import { contentCalendarRepo } from './repositories/content-calendar.js';
import { emailLogRepo } from './repositories/email-log.js';
import { approvalQueueRepo } from './repositories/approval-queue.js';
import { socialListeningReportsRepo } from './repositories/social-listening-reports.js';
import { influencersRepo } from './repositories/influencers.js';
import { campaignsRepo } from './repositories/campaigns.js';
import { competitorIntelRepo } from './repositories/competitor-intelligence.js';
import { memoryRepo } from './repositories/memory.js';
import { supabase } from './supabase-client.js';

export { supabase };
export { contentCalendarRepo as contentCalendar } from './repositories/content-calendar.js';
export { emailLogRepo as emailLog } from './repositories/email-log.js';
export { approvalQueueRepo as approvalQueue } from './repositories/approval-queue.js';
export { socialListeningReportsRepo as socialListeningReports } from './repositories/social-listening-reports.js';
export { influencersRepo as influencers } from './repositories/influencers.js';
export { campaignsRepo as campaigns } from './repositories/campaigns.js';
export { competitorIntelRepo as competitorIntelligence } from './repositories/competitor-intelligence.js';
export { memoryRepo as memory } from './repositories/memory.js';

export const db = {
  contentCalendar: contentCalendarRepo,
  emailLog: emailLogRepo,
  approvalQueue: approvalQueueRepo,
  socialListeningReports: socialListeningReportsRepo,
  influencers: influencersRepo,
  campaigns: campaignsRepo,
  competitorIntelligence: competitorIntelRepo,
  memory: memoryRepo
};
