import 'dotenv/config';
import { validateEnv, getEnvNumber } from './lib/utils/helpers.js';
import { app } from './api/index.js';
import { serve } from '@hono/node-server';
import { startQueueSchedulers } from './lib/queue/schedulers.js';
import { startScheduledTasks } from './jobs/scheduled-tasks.js';
import { logger } from './lib/utils/logger.js';

function main() {
  validateEnv();
  const port = getEnvNumber('PORT', 3000) ?? 3000;
  startQueueSchedulers();
  startScheduledTasks();
  serve({ fetch: app.fetch, port });
  logger.info('server_started', { port });
}

main();
