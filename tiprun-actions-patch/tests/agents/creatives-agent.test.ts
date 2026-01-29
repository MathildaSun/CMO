import { describe, it, expect, vi } from 'vitest';

type FalArgs = {
  prompt: string;
  imageSize?: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
};

vi.mock('../../src/lib/integrations/fal-ai.js', () => {
  return {
    generateImage: vi.fn(async () => {
      return { imageUrl: 'https://fal.fake/image.png', seed: 123456 };
    })
  };
});

import { CreativesAgent } from '../../src/agents/creatives-agent.ts';
import * as fal from '../../src/lib/integrations/fal-ai.js';

describe('CreativesAgent', () => {
  it('generates an image with platform-derived size', async () => {
    const out = await CreativesAgent.process({ prompt: 'Cricket stadium at night', platform: 'instagram', style: 'promotional' });
    expect(out.imageUrl).toBe('https://fal.fake/image.png');
    expect(out.imageSize).toBe('square');
    expect(out.promptUsed.toLowerCase()).toContain('cricket stadium at night');
    const calls = (fal.generateImage as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect((calls[0][0] as FalArgs).imageSize).toBe('square');
  });
});
