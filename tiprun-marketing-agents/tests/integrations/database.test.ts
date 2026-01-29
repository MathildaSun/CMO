import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, any[]> = {};
let idSeq = 1;

function now() {
  return new Date().toISOString();
}

function ensureTable(table: string) {
  if (!store[table]) store[table] = [];
}

function makeBuilder(table: string) {
  ensureTable(table);
  return {
    insert(payload: any) {
      const row = Array.isArray(payload) ? { ...payload[0] } : { ...payload };
      row.id = row.id || `id_${idSeq++}`;
      row.created_at = row.created_at || now();
      row.updated_at = row.updated_at || now();
      store[table].push(row);
      return {
        select() {
          return {
            single: async () => ({ data: row, error: null })
          };
        }
      };
    },
    update(patch: any) {
      return {
        eq(field: string, value: any) {
          const row = store[table].find((r) => r[field] === value);
          if (!row) {
            return {
              select() {
                return { single: async () => ({ data: null, error: { message: 'Not found' } }) };
              }
            };
          }
          Object.assign(row, patch);
          row.updated_at = now();
          return {
            select() {
              return { single: async () => ({ data: row, error: null }) };
            }
          };
        }
      };
    },
    select() {
      return {
        eq(field: string, value: any) {
          const row = store[table].find((r) => r[field] === value);
          return {
            single: async () => ({ data: row || null, error: row ? null : { message: 'Not found' } })
          };
        }
      };
    }
  };
}

vi.mock('../../src/lib/database/supabase-client.js', () => {
  return {
    supabase: {
      from(table: string) {
        return makeBuilder(table);
      }
    }
  };
});

import { db } from '../../src/lib/database/index.ts';

describe('database wiring', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    idSeq = 1;
  });

  it('exposes repositories on db object', () => {
    expect(db.contentCalendar).toBeDefined();
    expect(db.emailLog).toBeDefined();
    expect(db.approvalQueue).toBeDefined();
    expect(db.influencers).toBeDefined();
  });

  it('creates and retrieves a content calendar entry', async () => {
    const created = await db.contentCalendar.create({
      title: 'Test Post',
      content: 'Hello world',
      platform: 'twitter',
      contentType: 'post',
      createdBy: 'tester'
    });

    expect(created.id).toBeTruthy();
    expect(created.title).toBe('Test Post');
    expect(created.platform).toBe('twitter');

    const fetched = await db.contentCalendar.getById(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.content).toBe('Hello world');
  });

  it('updates a content calendar entry', async () => {
    const created = await db.contentCalendar.create({
      title: 'To Update',
      content: 'Old',
      platform: 'instagram',
      contentType: 'post',
      createdBy: 'tester'
    });

    const updated = await db.contentCalendar.update(created.id, { status: 'scheduled' });
    expect(updated.id).toBe(created.id);
    expect(updated.status).toBe('scheduled');
  });

  it('logs an email', async () => {
    const entry = await db.emailLog.create({
      recipient: 'user@example.com',
      subject: 'Hello',
      emailType: 'campaign',
      segment: 'waitlist'
    });

    expect(entry.id).toBeTruthy();
    expect(entry.subject).toBe('Hello');
    expect(entry.email_type).toBe('campaign');
  });
});
