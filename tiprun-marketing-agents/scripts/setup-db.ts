import 'dotenv/config';
import { Pool } from 'pg';
import { validateEnv } from '../src/lib/utils/helpers.js';

validateEnv(['DATABASE_URL']);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agents_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memory_agent ON agents_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON agents_memory USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  media_urls TEXT[],
  campaign_id UUID,
  late_dev_post_id TEXT,
  performance JSONB DEFAULT '{}',
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_calendar(status);
CREATE INDEX IF NOT EXISTS idx_content_scheduled ON content_calendar(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_platform ON content_calendar(platform);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  budget_usd DECIMAL(10,2),
  spent_usd DECIMAL(10,2) DEFAULT 0,
  target_metrics JSONB DEFAULT '{}',
  actual_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL,
  followers INTEGER,
  tier TEXT,
  niche TEXT[],
  engagement_rate DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'identified',
  rate_inr TEXT,
  contact_email TEXT,
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_influencer_handle ON influencers(handle, platform);

CREATE TABLE IF NOT EXISTS social_listening_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  brand_mentions INTEGER DEFAULT 0,
  sentiment_positive INTEGER DEFAULT 0,
  sentiment_neutral INTEGER DEFAULT 0,
  sentiment_negative INTEGER DEFAULT 0,
  sentiment_score DECIMAL(3,1),
  top_mentions JSONB DEFAULT '[]',
  competitor_activity JSONB DEFAULT '[]',
  trending_topics TEXT[],
  alerts JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  full_report TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_date ON social_listening_reports(report_date);

CREATE TABLE IF NOT EXISTS competitor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor TEXT NOT NULL,
  update_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  source_url TEXT,
  impact TEXT,
  our_response TEXT,
  spotted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_competitor ON competitor_intelligence(competitor);
CREATE INDEX IF NOT EXISTS idx_competitor_date ON competitor_intelligence(spotted_at);

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  segment TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  campaign_id UUID,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_email_recipient ON email_log(recipient);
CREATE INDEX IF NOT EXISTS idx_email_segment ON email_log(segment);

CREATE TABLE IF NOT EXISTS approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  title TEXT NOT NULL,
  details JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  slack_message_ts TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_queue(status);
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('Applying database schema...');
    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');
    console.log('Database schema applied successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error applying schema:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
