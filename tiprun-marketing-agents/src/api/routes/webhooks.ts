import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { db } from '../../lib/database/index.js';

const ResendEventSchema = z.object({
  type: z.string(),
  data: z.object({
    to: z.union([z.string(), z.array(z.string())]).optional(),
    subject: z.string().optional(),
    email: z
      .object({ to: z.union([z.string(), z.array(z.string())]).optional(), subject: z.string().optional() })
      .partial()
      .optional()
  })
});

function verifyWebhookSecret(c: Context): boolean {
  const expected = process.env.RESEND_WEBHOOK_SECRET || '';
  if (!expected) return false;
  const got = c.req.header('x-webhook-secret') || c.req.header('x-resend-signature') || '';
  return got === expected;
}

function mapTypeToStatus(t: string): 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'sent' {
  const lower = t.toLowerCase();
  if (lower.includes('delivered')) return 'delivered';
  if (lower.includes('opened') || lower.includes('open')) return 'opened';
  if (lower.includes('clicked') || lower.includes('click')) return 'clicked';
  if (lower.includes('bounced') || lower.includes('bounce')) return 'bounced';
  if (lower.includes('unsub')) return 'unsubscribed';
  if (lower.includes('sent')) return 'sent';
  return 'sent';
}

export const webhooksRouter = new Hono();

webhooksRouter.post('/webhooks/resend', async (c) => {
  if (!verifyWebhookSecret(c)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json().catch(() => null);
  const parsed = ResendEventSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

  const evt = parsed.data;
  const status = mapTypeToStatus(evt.type);
  const toField = evt.data.to || evt.data.email?.to;
  const subject = evt.data.subject || evt.data.email?.subject;

  const recipients = Array.isArray(toField) ? toField : toField ? [toField] : [];
  if (recipients.length === 0 || !subject) return c.json({ error: 'Missing recipient or subject' }, 400);

  for (const r of recipients) {
    await db.emailLog.create({ recipient: r, subject, emailType: 'campaign', status });
  }

  return c.json({ ok: true });
});
