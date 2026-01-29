import { Worker, type Job } from 'bullmq';
import { connection, attachWorkerEvents } from '../lib/queue/index.js';
import { sendEmailCampaign } from '../workflows/email-campaigns.js';

const concurrency = 3;

export const emailWorker = new Worker(
  'email',
  async (job: Job) => {
    switch (job.name) {
      case 'send-campaign':
        return await sendEmailCampaign(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection, concurrency }
);

attachWorkerEvents(emailWorker);
