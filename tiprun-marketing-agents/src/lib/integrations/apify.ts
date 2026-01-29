import { logger, providerError } from '../utils/logger.js';

type SortMode = 'Latest' | 'Top';

interface ApifyConfig {
  apiToken: string;
  baseUrl: string;
}

const config: ApifyConfig = {
  apiToken: process.env.APIFY_API_TOKEN || '',
  baseUrl: 'https://api.apify.com/v2'
};

function assertConfigured() {
  if (!config.apiToken) {
    const msg = 'Apify configuration missing: APIFY_API_TOKEN';
    logger.error(msg);
    throw new Error(msg);
  }
}

async function handleResponse(res: Response, context: string): Promise<unknown> {
  if (res.ok) return res.json();
  const text = await res.text();
  const snippet = text.length > 500 ? `${text.slice(0, 500)}…` : text;
  const err = providerError('Apify', context, { status: res.status, statusText: res.statusText }, snippet);
  logger.error('provider_error', { provider: 'Apify', context, status: res.status });
  throw err;
}

async function runActorAndGetItems(actorId: string, input: Record<string, unknown>): Promise<unknown[]> {
  assertConfigured();
  const runUrl = `${config.baseUrl}/acts/${actorId}/runs?waitForFinish=180`;
  const runRes = await fetch(runUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });
  type RunData = { data?: { defaultDatasetId?: string } };
  const runData = (await handleResponse(runRes, 'run actor')) as RunData;
  const datasetId = runData.data?.defaultDatasetId || '';
  if (!datasetId) return [];
  const datasetUrl = `${config.baseUrl}/datasets/${datasetId}/items`;
  const resultsRes = await fetch(datasetUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${config.apiToken}` }
  });
  const items = (await handleResponse(resultsRes, 'fetch dataset items')) as unknown;
  return Array.isArray(items) ? (items as unknown[]) : [];
}

export async function scrapeTweets(params: {
  searchTerms: string[];
  maxTweets?: number;
  onlyVerifiedUsers?: boolean;
  sort?: SortMode;
}): Promise<unknown[]> {
  const input = {
    searchTerms: params.searchTerms,
    maxTweets: params.maxTweets ?? 100,
    onlyVerifiedUsers: params.onlyVerifiedUsers ?? false,
    sort: params.sort ?? 'Latest'
  } as const;
  return runActorAndGetItems('apidojo~tweet-scraper', input as unknown as Record<string, unknown>);
}

export async function googleSearch(params: {
  queries: string;
  maxPages?: number;
  resultsPerPage?: number;
  countryCode?: string;
  languageCode?: string;
}): Promise<unknown[]> {
  const input = {
    queries: params.queries,
    maxPagesPerQuery: params.maxPages ?? 1,
    resultsPerPage: params.resultsPerPage ?? 10,
    countryCode: params.countryCode ?? 'in',
    languageCode: params.languageCode ?? 'en'
  } as const;
  return runActorAndGetItems('apify~google-search-scraper', input as unknown as Record<string, unknown>);
}
