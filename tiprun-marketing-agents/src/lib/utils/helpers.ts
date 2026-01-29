export function validateEnv(requiredKeys?: string[]) {
  const defaultRequired = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'REDIS_URL',
    'SLACK_BOT_TOKEN',
    'SLACK_CHANNEL_ALERTS',
    'SLACK_CHANNEL_UPDATES',
    'SLACK_CHANNEL_WINS'
  ];

  const keys = requiredKeys && requiredKeys.length ? requiredKeys : defaultRequired;
  const missing = keys.filter((k) => {
    const v = process.env[k];
    return v === undefined || String(v).trim() === '';
  });

  if (missing.length) {
    const list = missing.map((k) => `- ${k}`).join('\n');
    const msg = `Missing required environment variables:\n${list}\nSet them in your environment or .env file.`;
    console.error(msg);
    process.exit(1);
  }
}

export function getEnvNumber(key: string, fallback?: number): number | undefined {
  const v = process.env[key];
  if (v === undefined || v.trim() === '') return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) {
    console.error(`Invalid numeric value for ${key}`);
    process.exit(1);
  }
  return n;
}
