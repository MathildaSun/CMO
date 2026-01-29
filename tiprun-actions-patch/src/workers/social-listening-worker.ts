import { Worker, type Job } from 'bullmq';
import { connection, attachWorkerEvents } from '../lib/queue/index.js';
import { runDailySocialListening } from '../workflows/social-listening.js';

const concurrency = 2;

export const socialListeningWorker = new Worker(
  'social-listening',
  async (job: Job) => {
    switch (job.name) {
      case 'daily-report':
        return await runDailySocialListening(job.data?.date);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection, concurrency }
);

attachWorkerEvents(socialListeningWorker);
