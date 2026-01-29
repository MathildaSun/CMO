type Level = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const envLevel = (process.env.LOG_LEVEL as Level) || 'info';
const minLevel = levelOrder[envLevel] ?? 20;

function now() {
  return new Date().toISOString();
}

function safe(obj: unknown) {
  try {
    return JSON.parse(JSON.stringify(obj, (_k, v) => {
      if (typeof v === 'string' && v.length > 0) {
        if (/^sk-[a-zA-Z0-9]/.test(v) || /xox[baprs]-/.test(v) || /Bearer\s+[A-Za-z0-9\-_.]+/.test(v)) return '[redacted]';
        if (v.length > 2000) return `${v.slice(0, 2000)}…`;
      }
      return v;
    }));
  } catch {
    return '[unserializable]';
  }
}

function write(level: Level, message: string, fields?: Record<string, unknown>) {
  if (levelOrder[level] < minLevel) return;
  const line = {
    level,
    time: now(),
    msg: message,
    ...safe(fields)
  } as Record<string, unknown>;
  const s = JSON.stringify(line);
  if (level === 'error') process.stderr.write(s + '\n');
  else process.stdout.write(s + '\n');
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields)
};

type ProviderErr = Error & { provider?: string; context?: string; status?: number };

export function providerError(provider: string, context: string, res?: { status: number; statusText?: string }, bodySnippet?: string) {
  const statusText = res?.statusText || '';
  const status = typeof res?.status === 'number' ? res!.status : undefined;
  const parts = [`${provider} ${context} failed`];
  if (typeof status === 'number') parts.push(`${status}${statusText ? ' ' + statusText : ''}`);
  if (bodySnippet) parts.push(`Body: ${bodySnippet}`);
  const err: ProviderErr = new Error(parts.join(': '));
  err.provider = provider;
  err.context = context;
  if (typeof status === 'number') err.status = status;
  return err;
}
