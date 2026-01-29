import { Hono } from 'hono';

export const healthRouter = new Hono();

healthRouter.get('/health', (c) => {
  const version = process.env.npm_package_version || 'dev';
  return c.json({ status: 'ok', version, uptimeSeconds: Math.floor(process.uptime()) });
});
