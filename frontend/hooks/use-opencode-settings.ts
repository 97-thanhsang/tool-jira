import useSWR from 'swr';
import { apiBackend } from '@/lib/api';

const fetcher = (url: string) => apiBackend.get(url).then((r) => r.data.data);

// ─── Service status ───────────────────────────────────────────────────────────

export interface ServiceStatus {
  running: boolean;
  managed: boolean;
  pid?: number;
  port: number;
  version?: string;
  startedAt?: string;
  directory?: string;
}

export function useServiceStatus() {
  const { data, error, isLoading, mutate } = useSWR<ServiceStatus>(
    '/api/opencode/service',
    fetcher,
    { refreshInterval: 5000 }
  );
  return { status: data, isLoading, error, refresh: mutate };
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface OpenCodeConfig {
  project: Record<string, unknown>;
  global: Record<string, unknown>;
  merged: Record<string, unknown>;
  filePath: string | null;
}

export function useOpenCodeConfig() {
  const { data, error, isLoading, mutate } = useSWR<OpenCodeConfig>(
    '/api/opencode/config',
    fetcher
  );
  return { config: data, isLoading, error, refresh: mutate };
}

export async function updateConfig(updates: Record<string, unknown>) {
  const res = await apiBackend.patch('/api/opencode/config', updates);
  return res.data;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export interface AgentInfo {
  id?: string;
  name?: string;
  mode?: string;
  description?: string;
  model?: string;
  hidden?: boolean;
  color?: string;
}

export function useOpenCodeAgents() {
  const { data, error, isLoading } = useSWR<unknown>(
    '/api/opencode/agents-list',
    fetcher,
    { revalidateOnFocus: false }
  );
  const agents: AgentInfo[] = Array.isArray(data) ? (data as AgentInfo[]) : [];
  return { agents, isLoading, error };
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export interface CommandInfo {
  name?: string;
  description?: string;
  agent?: string;
  model?: string;
  subtask?: boolean;
}

export function useOpenCodeCommands() {
  const { data, error, isLoading, mutate } = useSWR<unknown>(
    '/api/opencode/commands-list',
    fetcher,
    { revalidateOnFocus: false }
  );
  const commands: CommandInfo[] = Array.isArray(data) ? (data as CommandInfo[]) : [];
  return { commands, isLoading, error, refresh: mutate };
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export interface SkillInfo {
  name?: string;
  description?: string;
  location?: string;
}

export function useOpenCodeSkills() {
  const { data, error, isLoading } = useSWR<unknown>(
    '/api/opencode/skills-list',
    fetcher,
    { revalidateOnFocus: false }
  );
  const skills: SkillInfo[] = Array.isArray(data) ? (data as SkillInfo[]) : [];
  return { skills, isLoading, error };
}

// ─── Providers / Models ───────────────────────────────────────────────────────

export interface ProviderInfo {
  id: string;
  name?: string;
  label?: string;
  models: string[];
}

export function useOpenCodeProviders() {
  const { data, error, isLoading } = useSWR<unknown>(
    '/api/opencode/providers',
    fetcher,
    { revalidateOnFocus: false }
  );
  // Live response shape may differ from static catalog; normalize
  let providers: ProviderInfo[] = [];
  if (Array.isArray(data)) {
    providers = (data as ProviderInfo[]);
  } else if (data && typeof data === 'object') {
    // OpenCode /config/providers may return { anthropic: { models: [...] }, ... }
    providers = Object.entries(data as Record<string, unknown>).map(([id, val]) => {
      const v = val as Record<string, unknown>;
      const models = Array.isArray(v?.models)
        ? (v.models as { id: string }[]).map((m) => (typeof m === 'string' ? m : `${id}/${m.id}`))
        : [];
      return { id, name: (v?.name as string) ?? id, models };
    });
  }
  return { providers, isLoading, error };
}

// ─── MCP servers ─────────────────────────────────────────────────────────────

export interface McpServerInfo {
  name: string;
  type?: 'local' | 'remote';
  enabled?: boolean;
  status?: string;
  state?: string;
  command?: string[];
  url?: string;
  error?: string;
}

export function useMcpStatus() {
  const { data, error, isLoading, mutate } = useSWR<unknown>(
    '/api/opencode/mcp-status',
    fetcher,
    { refreshInterval: 15000 }
  );
  const servers: McpServerInfo[] = Array.isArray(data) ? (data as McpServerInfo[]) : [];
  return { servers, isLoading, error, refresh: mutate };
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface SessionInfo {
  id: string;
  title?: string;
  parentID?: string;
  share?: string;
  version?: number;
  time?: { created: number; updated: number };
}

export function useOpenCodeSessions() {
  const { data, error, isLoading, mutate } = useSWR<unknown>(
    '/api/opencode/sessions',
    fetcher,
    { refreshInterval: 10000 }
  );
  const sessions: SessionInfo[] = Array.isArray(data) ? (data as SessionInfo[]) : [];
  return { sessions, isLoading, error, refresh: mutate };
}

export async function deleteSession(sessionId: string) {
  await apiBackend.delete(`/api/opencode/sessions/${sessionId}`);
}
