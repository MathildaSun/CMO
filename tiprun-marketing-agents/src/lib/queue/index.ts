import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { sendMessage } from '../integrations/slack.js';
import { logger } from '../utils/logger.js';

const redisUrl = process.env.REDIS_URL as string;
export const connection = new Redis(redisUrl);

export const contentQueue = new Queue('content', { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
export const socialListeningQueue = new Queue('social-listening', { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
export const emailQueue = new Queue('email', { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
export const researchQueue = new Queue('research', { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });

export function attachWorkerEvents<T>(worker: Worker<T, unknown, string>) {
  worker.on('completed', (job) => {
    logger.info('job_completed', { queue: job.queueName, name: job.name, id: job.id });
  });
  worker.on('failed', async (job, err) => {
    const id = job?.id ?? 'unknown';
    const name = job?.name ?? 'unknown';
    const queueName = job?.queueName ?? 'unknown';
    const attemptsMade = job?.attemptsMade ?? 0;
    const attempts = job?.opts?.attempts ?? 1;
    logger.error('job_failed', { queue: queueName, name, id, attemptsMade, attempts, error: err.message });
    if (attemptsMade >= attempts) {
      const msg = `❌ Queue: ${queueName}\nJob: ${name} (${id}) failed after ${attemptsMade} attempts\nReason: ${err.message}`;
      try {
        await sendMessage({ channel: 'alerts', text: msg });
      } catch (e) {
        logger.warn('slack_alert_send_failed');
      }
    }
  });
}
