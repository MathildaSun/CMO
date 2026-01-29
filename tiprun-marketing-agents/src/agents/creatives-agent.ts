import { generateImage, FalImageSize } from '../lib/integrations/fal-ai.js';
import { BaseAgent, AgentContext, Telemetry } from './base-agent.js';

export type CreativesGenerateInput = {
  prompt: string;
  platform?: 'twitter' | 'instagram' | 'telegram' | 'youtube';
  style?: 'promotional' | 'educational' | 'meme' | 'announcement';
  imageSize?: FalImageSize;
};

export type CreativesGenerateOutput = {
  imageUrl: string;
  seed: number;
  promptUsed: string;
  imageSize: FalImageSize;
  style?: string;
};

export const CREATIVES_AGENT_PROMPT = `
You are the Creatives Agent for TipRun, generating on-brand images via Fal.ai Flux.

Colors: Deep Blue (#1a1a2e), Vibrant Orange (#ff6b35), Cricket Green (#2ecc71)
Style: modern, clean, tech-forward; integrate cricket elements naturally; avoid clutter and stock aesthetics
Quality: 4K quality, sharp focus, well-lit, dynamic composition
Image sizes: twitter/telegram/youtube → landscape_16_9; instagram → square
Content styles: promotional | educational | meme | announcement
`;

function defaultSizeForPlatform(p?: CreativesGenerateInput['platform']): FalImageSize {
  if (!p) return 'landscape_16_9';
  if (p === 'instagram') return 'square';
  return 'landscape_16_9';
}

function styleMood(style?: CreativesGenerateInput['style']): string {
  if (style === 'promotional') return 'exciting, dynamic, confident';
  if (style === 'educational') return 'clear, professional, approachable';
  if (style === 'meme') return 'playful, bold, high-contrast';
  if (style === 'announcement') return 'clean, confident, product-focused';
  return 'modern, dynamic';
}

class CreativesAgentImpl implements BaseAgent<CreativesGenerateInput, CreativesGenerateOutput> {
  id = 'creatives_agent';
  model = 'gpt-4o-mini';
  telemetry?: Telemetry;

  constructor(telemetry?: Telemetry) {
    this.telemetry = telemetry;
  }

  async process(input: CreativesGenerateInput, ctx?: AgentContext): Promise<CreativesGenerateOutput> {
    return this.generate(input, ctx);
  }

  async generate(input: CreativesGenerateInput, ctx?: AgentContext): Promise<CreativesGenerateOutput> {
    try {
      await this.telemetry?.start(this.id, input, ctx);
      const size = input.imageSize || defaultSizeForPlatform(input.platform);
      const promptUsed = [
        input.prompt.trim(),
        'modern, digital, clean, vibrant',
        styleMood(input.style),
        '4K quality, sharp focus, well-lit'
      ]
        .filter(Boolean)
        .join(', ');

      const { imageUrl, seed } = await generateImage({ prompt: promptUsed, imageSize: size });
      const out: CreativesGenerateOutput = { imageUrl, seed, promptUsed, imageSize: size, style: input.style };
      await this.telemetry?.end(this.id, out, ctx);
      return out;
    } catch (err) {
      await this.telemetry?.error(this.id, err, ctx);
      throw err;
    }
  }
}

export const CreativesAgent = new CreativesAgentImpl();
export type CreativesAgentType = CreativesAgentImpl;
