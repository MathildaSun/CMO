import { Worker, type Job } from 'bullmq';
import { connection, attachWorkerEvents } from '../lib/queue/index.js';
import { createAndPublishContent } from '../workflows/content-publishing.js';

const concurrency = 5;

export const contentWorker = new Worker(
  'content',
  async (job: Job) => {
    switch (job.name) {
      case 'create-content':
        return await createAndPublishContent(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection, concurrency }
);

attachWorkerEvents(contentWorker);
