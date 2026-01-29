import cron from 'node-cron';
import { socialListeningQueue, researchQueue } from '../lib/queue/index.js';

export function startScheduledTasks() {
  cron.schedule('30 2 * * *', async () => {
    await socialListeningQueue.add('daily-report', {});
  });

  cron.schedule('30 3 * * 1', async () => {
    await researchQueue.add('weekly-competitor-analysis', {});
  });
}
