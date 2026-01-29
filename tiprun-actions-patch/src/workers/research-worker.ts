import { Worker, type Job } from 'bullmq';
import { connection, attachWorkerEvents } from '../lib/queue/index.js';
import { runResearchReport } from '../workflows/research-reports.js';

const concurrency = 2;

export const researchWorker = new Worker(
  'research',
  async (job: Job) => {
    switch (job.name) {
      case 'research-report':
        return await runResearchReport(job.data);
      case 'weekly-competitor-analysis':
        return await runResearchReport({ topic: 'Weekly competitor analysis', includeTweets: true, depth: 'standard' });
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection, concurrency }
);

attachWorkerEvents(researchWorker);
