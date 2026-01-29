import { Resend } from 'resend';
import { logger, providerError } from '../utils/logger.js';

interface ResendConfig {
  apiKey: string;
  defaultFrom: string;
}

const config: ResendConfig = {
  apiKey: process.env.RESEND_API_KEY || '',
  defaultFrom: 'TipRun <noreply@tiprun.io>'
};

function assertConfigured() {
  if (!config.apiKey) {
    const msg = 'Resend configuration missing: RESEND_API_KEY';
    logger.error(msg);
    throw new Error(msg);
  }
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  scheduledAt?: string;
}): Promise<{ id: string }> {
  assertConfigured();

  const resend = new Resend(config.apiKey);

  const toArray = Array.isArray(params.to) ? params.to : [params.to];
  if (!toArray.length) throw new Error('Resend sendEmail requires at least one recipient');

  if (params.scheduledAt) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: params.from || config.defaultFrom,
        to: toArray,
        subject: params.subject,
        html: params.html,
        text: params.text,
        scheduled_at: params.scheduledAt
      })
    });

    if (!res.ok) {
      const text = await res.text();
      const snippet = text.length > 500 ? `${text.slice(0, 500)}…` : text;
      const err = providerError('Resend', 'sendEmail', { status: res.status, statusText: res.statusText }, snippet);
      logger.error('provider_error', { provider: 'Resend', context: 'sendEmail', status: res.status });
      throw err;
    }

    const json = (await res.json()) as { id?: string };
    return { id: json.id || '' };
  }

  const { data, error } = await resend.emails.send({
    from: params.from || config.defaultFrom,
    to: toArray,
    subject: params.subject,
    html: params.html,
    text: params.text
  });

  if (error) {
    let message = String(error);
    if (typeof error === 'object' && error && 'message' in error) {
      const m = (error as { message?: unknown }).message;
      message = typeof m === 'string' ? m : JSON.stringify(m);
    }
    const err = new Error(`Resend sendEmail failed: ${message}`);
    logger.error('provider_error', { provider: 'Resend', context: 'sendEmail' });
    throw err;
  }

  return { id: data?.id || '' };
}
