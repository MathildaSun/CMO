export type AgentContext = { agentId?: string; requestId?: string; metadata?: Record<string, unknown> };

export interface TelemetrySink {
  onStart?(agent: string, input: unknown, ctx?: AgentContext): void | Promise<void>;
  onEnd?(agent: string, output: unknown, ctx?: AgentContext): void | Promise<void>;
  onError?(agent: string, error: unknown, ctx?: AgentContext): void | Promise<void>;
}

export class Telemetry {
  private sinks: TelemetrySink[];
  constructor(sinks?: TelemetrySink[]) {
    this.sinks = sinks || [];
  }
  addSink(sink: TelemetrySink) {
    this.sinks.push(sink);
  }
  async start(agent: string, input: unknown, ctx?: AgentContext) {
    await Promise.all(this.sinks.map((s) => s.onStart?.(agent, input, ctx)));
  }
  async end(agent: string, output: unknown, ctx?: AgentContext) {
    await Promise.all(this.sinks.map((s) => s.onEnd?.(agent, output, ctx)));
  }
  async error(agent: string, err: unknown, ctx?: AgentContext) {
    await Promise.all(this.sinks.map((s) => s.onError?.(agent, err, ctx)));
  }
}

export interface BaseAgent<I, O> {
  id: string;
  model?: string;
  telemetry?: Telemetry;
  process(input: I, ctx?: AgentContext): Promise<O>;
}
