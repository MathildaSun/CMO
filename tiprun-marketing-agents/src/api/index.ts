import { Hono } from 'hono';
import { healthRouter } from './routes/health.js';
import { contentRouter } from './routes/content.js';
import { webhooksRouter } from './routes/webhooks.js';
import { handleSlackInteraction, type SlackInteractionPayload } from './slack/interactions.js';
import crypto from 'node:crypto';

export const app = new Hono();

app.route('/', healthRouter);
app.route('/', contentRouter);
app.route('/', webhooksRouter);

function verifySlackSignature(headers: Headers, rawBody: string) {
  const ts = headers.get('x-slack-request-timestamp') || '';
  const sig = headers.get('x-slack-signature') || '';
  const secret = process.env.SLACK_SIGNING_SECRET || '';
  if (!ts || !sig || !secret) return false;
  const base = `v0:${ts}:${rawBody}`;
  const hmac = crypto.createHmac('sha256', secret).update(base).digest('hex');
  const expected = `v0=${hmac}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

app.post('/slack/interactions', async (c) => {
  const raw = await c.req.text();
  if (!verifySlackSignature(c.req.raw.headers, raw)) return c.json({ error: 'Unauthorized' }, 401);

  const params = new URLSearchParams(raw);
  const payloadStr = params.get('payload') || '{}';
  let payload: unknown;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return c.json({ error: 'Invalid payload' }, 400);
  }

  const res = await handleSlackInteraction(payload as SlackInteractionPayload);
  return c.json(res);
});
