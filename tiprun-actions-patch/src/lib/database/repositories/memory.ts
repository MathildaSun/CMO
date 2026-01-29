import { supabase } from '../supabase-client.js';

export type AgentMemoryRow = {
  id: string;
  agent_id: string;
  memory_type: 'short_term' | 'long_term' | 'episodic';
  key: string;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentMemoryCreate = {
  agentId: string;
  memoryType: AgentMemoryRow['memory_type'];
  key: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  expiresAt?: string;
};

function toDb(input: AgentMemoryCreate) {
  return {
    agent_id: input.agentId,
    memory_type: input.memoryType,
    key: input.key,
    content: input.content,
    embedding: input.embedding,
    metadata: input.metadata ?? {},
    expires_at: input.expiresAt
  } as const;
}

export const memoryRepo = {
  async create(input: AgentMemoryCreate) {
    const { data, error } = await supabase.from('agents_memory').insert(toDb(input)).select().single();
    if (error) throw error;
    return data as unknown as AgentMemoryRow;
  },
  async searchByAgent(agentId: string, keyLike?: string) {
    let query = supabase.from('agents_memory').select('*').eq('agent_id', agentId);
    if (keyLike) query = query.ilike('key', `%${keyLike}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as AgentMemoryRow[];
  }
};
