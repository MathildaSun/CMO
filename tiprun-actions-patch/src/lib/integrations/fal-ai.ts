import { logger, providerError } from '../utils/logger.js';

export type FalImageSize =
  | 'landscape_16_9'
  | 'square'
  | 'square_hd'
  | 'portrait_16_9'
  | 'portrait_4_3';

interface FalAiConfig {
  apiKey: string;
  baseUrl: string;
}

const config: FalAiConfig = {
  apiKey: process.env.FAL_AI_API_KEY || '',
  baseUrl: 'https://fal.run/fal-ai/flux/dev'
};

function assertConfigured() {
  if (!config.apiKey) {
    const msg = 'Fal.ai configuration missing: FAL_AI_API_KEY';
    logger.error(msg);
    throw new Error(msg);
  }
}

async function handleResponse(res: Response, context: string): Promise<unknown> {
  if (res.ok) return res.json();
  const text = await res.text();
  const snippet = text.length > 500 ? `${text.slice(0, 500)}…` : text;
  const err = providerError('Fal.ai', context, { status: res.status, statusText: res.statusText }, snippet);
  logger.error('provider_error', { provider: 'Fal.ai', context, status: res.status });
  throw err;
}

export async function generateImage(params: {
  prompt: string;
  imageSize?: FalImageSize;
  numInferenceSteps?: number;
  guidanceScale?: number;
}): Promise<{ imageUrl: string; seed: number }> {
  assertConfigured();

  const body = {
    prompt: params.prompt,
    image_size: params.imageSize || 'landscape_16_9',
    num_inference_steps: params.numInferenceSteps ?? 28,
    guidance_scale: params.guidanceScale ?? 3.5,
    num_images: 1,
    enable_safety_checker: true
  } as const;

  const res = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Key ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  type FalResponse = {
    images?: { url?: string }[];
    seed?: number;
  };

  const data = (await handleResponse(res, 'generate image')) as FalResponse;
  const imageUrl = data.images?.[0]?.url || '';
  if (!imageUrl) {
    const msg = 'Fal.ai generate image returned no image URL';
    logger.error(msg);
    throw new Error(msg);
  }
  return { imageUrl, seed: data.seed ?? 0 };
}
