import 'dotenv/config';
import { sendMessage } from '../src/lib/integrations/slack.js';
import { getAccounts as getLateAccounts } from '../src/lib/integrations/late-dev.js';
import { generateImage } from '../src/lib/integrations/fal-ai.js';

async function checkHealth() {
  const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const url = `${base}/health`;
  try {
    const res = await fetch(url);
    const ok = res.ok;
    const body = await res.text();
    console.log('[health]', ok ? 'OK' : `FAIL ${res.status}`, body);
    return ok;
  } catch (err) {
    console.error('[health] ERROR', (err as Error).message);
    return false;
  }
}

async function checkSlack() {
  if (process.env.SMOKE_SEND_SLACK !== '1') {
    console.log('[slack] skipped (set SMOKE_SEND_SLACK=1 to enable)');
    return true;
  }
  try {
    const { ts } = await sendMessage({ channel: 'updates', text: 'Staging smoke: API online ✅' });
    console.log('[slack] OK', { ts });
    return true;
  } catch (err) {
    console.error('[slack] ERROR', (err as Error).message);
    return false;
  }
}

async function checkLateDev() {
  if (process.env.SMOKE_CHECK_LATE !== '1') {
    console.log('[late.dev] skipped (set SMOKE_CHECK_LATE=1 to enable)');
    return true;
  }
  try {
    const accounts = await getLateAccounts();
    console.log('[late.dev] OK', Array.isArray(accounts) ? `${accounts.length} accounts` : 'response received');
    return true;
  } catch (err) {
    console.error('[late.dev] ERROR', (err as Error).message);
    return false;
  }
}

async function checkFalAi() {
  if (process.env.SMOKE_CHECK_FAL !== '1') {
    console.log('[fal.ai] mocked (set SMOKE_CHECK_FAL=1 to call provider)');
    return true;
  }
  try {
    const { imageUrl } = await generateImage({ prompt: 'diagnostic image: minimal smoke test', imageSize: 'square' });
    console.log('[fal.ai] OK', imageUrl);
    return true;
  } catch (err) {
    console.error('[fal.ai] ERROR', (err as Error).message);
    return false;
  }
}

async function main() {
  const results = await Promise.all([
    checkHealth(),
    checkSlack(),
    checkLateDev(),
    checkFalAi()
  ]);
  const ok = results.every(Boolean);
  if (!ok) {
    process.exitCode = 1;
  }
}

main();
