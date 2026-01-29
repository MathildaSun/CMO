import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { contentQueue } from '../../lib/queue/index.js';

const CreateContentSchema = z.object({
  brief: z.string().min(1),
  platforms: z.array(z.enum(['twitter', 'instagram', 'telegram'])).min(1),
  contentType: z.enum(['post', 'thread', 'story', 'reel', 'video']),
  includeImage: z.boolean(),
  scheduledFor: z.string().optional(),
  campaignId: z.string().optional(),
  autoApprove: z.boolean().optional()
});

function requireBearer(c: Context) {
  const token = process.env.API_BEARER_TOKEN || '';
  const header = c.req.header('authorization') || c.req.header('Authorization') || '';
  const expected = token ? `Bearer ${token}` : '';
  if (!token || header !== expected) {
    return false;
  }
  return true;
}

export const contentRouter = new Hono();

contentRouter.post('/content/create', async (c) => {
  if (!requireBearer(c)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json().catch(() => null);
  const parsed = CreateContentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  const job = await contentQueue.add('create-content', parsed.data);
  return c.json({ jobId: job.id, queue: job.queueName });
});
