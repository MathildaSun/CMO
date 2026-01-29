import { logger, providerError } from '../utils/logger.js';

export type LatePlatform = 'twitter' | 'instagram' | 'telegram';
export type LateAccount = { platform: LatePlatform; accountId: string } & Record<string, unknown>;

interface LateDevConfig {
  apiKey: string;
  baseUrl: string;
  accounts: Record<LatePlatform, string>;
}

const config: LateDevConfig = {
  apiKey: process.env.LATE_DEV_API_KEY || '',
  baseUrl: 'https://getlate.dev/api/v1',
  accounts: {
    twitter: process.env.LATE_TWITTER_ACCOUNT_ID || '',
    instagram: process.env.LATE_INSTAGRAM_ACCOUNT_ID || '',
    telegram: process.env.LATE_TELEGRAM_ACCOUNT_ID || ''
  }
};

function assertConfigured() {
  const missing: string[] = [];
  if (!config.apiKey) missing.push('LATE_DEV_API_KEY');
  (Object.keys(config.accounts) as LatePlatform[]).forEach((p) => {
    if (!config.accounts[p]) missing.push(`LATE_${p.toUpperCase()}_ACCOUNT_ID`);
  });
  if (missing.length) {
    const list = missing.map((k) => `- ${k}`).join('\n');
    const msg = `Late.dev configuration missing required environment variables:\n${list}`;
    logger.error(msg);
    throw new Error(msg);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

async function handleResponse(res: Response, context: string): Promise<unknown> {
  if (res.ok) return res.json();
  const text = await res.text();
  const snippet = text.length > 500 ? `${text.slice(0, 500)}…` : text;
  const err = providerError('Late.dev', context, { status: res.status, statusText: res.statusText }, snippet);
  logger.error('provider_error', { provider: 'Late.dev', context, status: res.status });
  throw err;
}

export async function publishPost(params: {
  content: string;
  platforms: LatePlatform[];
  mediaItems?: { url: string }[];
  scheduledFor?: string;
}): Promise<{ postId: string; status: string }> {
  assertConfigured();

  const platformConfigs = params.platforms.map((p) => ({
    platform: p,
    accountId: config.accounts[p]
  }));

  const body = {
    content: params.content,
    platforms: platformConfigs,
    mediaItems: params.mediaItems,
    scheduledFor: params.scheduledFor,
    publishNow: !params.scheduledFor
  } as const;

  const res = await fetch(`${config.baseUrl}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  type PublishData = { post?: { _id?: string; status?: string }; id?: string; status?: string };
  const data = (await handleResponse(res, 'publish')) as PublishData;
  return { postId: data.post?._id ?? data.id ?? '', status: data.post?.status ?? data.status ?? 'unknown' };
}

export async function getAccounts(): Promise<LateAccount[]> {
  if (!config.apiKey) {
    const msg = 'Late.dev configuration missing: LATE_DEV_API_KEY';
    logger.error(msg);
    throw new Error(msg);
  }

  const res = await fetch(`${config.baseUrl}/accounts`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${config.apiKey}` }
  });

  const data = await handleResponse(res, 'get accounts');
  let accounts: unknown = data;
  if (isRecord(data) && Array.isArray((data as Record<string, unknown>).accounts)) {
    accounts = (data as Record<string, unknown>).accounts as unknown[];
  }
  const arr: unknown[] = Array.isArray(accounts) ? (accounts as unknown[]) : [];
  return arr as LateAccount[];
}
