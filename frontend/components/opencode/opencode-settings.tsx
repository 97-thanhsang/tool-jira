'use client';

import { useState, useCallback, Fragment } from 'react';
import { cn } from '@/lib/utils';
import { apiBackend } from '@/lib/api';
import {
  useServiceStatus,
  useOpenCodeConfig,
  useOpenCodeAgents,
  useOpenCodeCommands,
  useOpenCodeSkills,
  useOpenCodeProviders,
  useMcpStatus,
  useOpenCodeSessions,
  updateConfig,
  deleteSession,
} from '@/hooks/use-opencode-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Section({ title, icon, action, children }: {
  title: string; icon: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>{icon}</span><span>{title}</span>
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="text-center py-6 text-sm text-muted-foreground">
      <p className="text-2xl mb-1">{icon}</p>
      <p>{text}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  );
}

function OfflineNote() {
  return (
    <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
      ⚠️ OpenCode server is offline — showing cached/static data.
    </p>
  );
}

// ─── 1. Service Control ───────────────────────────────────────────────────────

function ServiceSection() {
  const { status, isLoading, refresh } = useServiceStatus();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggle = async () => {
    setBusy(true); setErr('');
    try {
      const ep = status?.running ? '/api/opencode/service/stop' : '/api/opencode/service/start';
      await apiBackend.post(ep);
      // Poll until state flips
      let n = 0;
      const iv = setInterval(async () => { n++; await refresh(); if (n >= 20) clearInterval(iv); }, 800);
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };

  return (
    <Section title="Service" icon="🖥️">
      {isLoading ? <div className="h-10 bg-muted animate-pulse rounded" /> : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors',
                status?.running ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-muted-foreground/30',
              )} />
              <span className="font-semibold text-sm">
                {status?.running ? 'Running' : 'Stopped'}
              </span>
              {status?.version && <Badge variant="secondary" className="text-xs">v{status.version}</Badge>}
              {status?.managed === false && status.running && (
                <Badge variant="outline" className="text-xs">External process</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant={status?.running ? 'destructive' : 'default'}
              onClick={toggle} disabled={busy}
            >
              {busy ? '⏳' : status?.running ? '■ Stop' : '▶ Start'}
            </Button>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xs font-mono">
            {([
              ['Port', String(status?.port ?? 4096)],
              status?.pid       ? ['PID', String(status.pid)]                                  : null,
              status?.directory ? ['Dir', status.directory]                                     : null,
              status?.startedAt ? ['Started', new Date(status.startedAt).toLocaleTimeString()] : null,
            ] as Array<[string, string] | null>).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
              <Fragment key={k}><span className="text-muted-foreground">{k}</span><span>{v}</span></Fragment>
            ))}
          </div>

          {!status?.running && (
            <p className="text-xs text-muted-foreground">
              Runs: <code className="bg-muted px-1 rounded">opencode serve --port {status?.port ?? 4096}</code>
            </p>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
      )}
    </Section>
  );
}

// ─── 2. Sessions ─────────────────────────────────────────────────────────────

function SessionsSection() {
  const { sessions, isLoading, refresh } = useOpenCodeSessions();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    setDeleting(id);
    try { await deleteSession(id); await refresh(); }
    catch (e) { alert(String(e)); }
    finally { setDeleting(null); }
  };

  return (
    <Section title={`Sessions (${sessions.length})`} icon="💬"
      action={<Button size="sm" variant="ghost" onClick={() => refresh()}>↺</Button>}>
      {isLoading ? <div className="h-12 bg-muted animate-pulse rounded" /> :
       sessions.length === 0 ? (
        <EmptyState icon="💬" text="No sessions found"
          sub="Sessions are created when you run a prompt in OpenCode." />
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {sessions.map((s) => {
            const updatedAt = s.time?.updated
              ? new Date(s.time.updated).toLocaleString()
              : undefined;
            return (
              <div key={s.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <p className="text-sm font-medium truncate">{s.title ?? '(untitled)'}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{s.id}</p>
                  {updatedAt && <p className="text-xs text-muted-foreground">{updatedAt}</p>}
                </div>
                <Button
                  size="sm" variant="ghost"
                  className="text-red-500 hover:text-red-700 shrink-0"
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                >
                  {deleting === s.id ? '...' : '✕'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ─── 3. Agents ────────────────────────────────────────────────────────────────

const MODE_PILL: Record<string, string> = {
  primary:  'bg-blue-100 text-blue-700 border-blue-200',
  subagent: 'bg-purple-100 text-purple-700 border-purple-200',
};

function modelDisplay(m: unknown): string {
  if (typeof m === 'string') return m;
  if (m && typeof m === 'object') {
    const obj = m as Record<string, string>;
    return obj.providerID && obj.modelID ? `${obj.providerID}/${obj.modelID}` : JSON.stringify(m);
  }
  return String(m);
}

function AgentsSection() {
  const { agents, isLoading } = useOpenCodeAgents();
  const { config, refresh: refreshConfig } = useOpenCodeConfig();
  const [saving, setSaving] = useState(false);

  const currentDefault = (config?.merged?.default_agent as string) ?? 'build';

  const setDefault = async (name: string) => {
    if (name === currentDefault) return;
    setSaving(true);
    try { await updateConfig({ default_agent: name }); await refreshConfig(); }
    finally { setSaving(false); }
  };

  const visibleAgents = agents.filter((a) => !a.hidden);

  return (
    <Section title="Agents" icon="🤖">
      {isLoading ? <div className="h-20 bg-muted animate-pulse rounded" /> :
       visibleAgents.length === 0 ? (
        <EmptyState icon="🤖" text="Server offline" sub="Start the OpenCode service to see live agents." />
      ) : (
        <div className="space-y-2">
          {visibleAgents.map((a) => {
            const id = a.id ?? a.name ?? '';
            const isDefault = id === currentDefault;
            const mode = a.mode ?? 'subagent';
            return (
              <div key={id}
                onClick={() => !saving && setDefault(id)}
                className={cn(
                  'flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  isDefault ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/40 hover:bg-muted',
                )}>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold">{id}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded border', MODE_PILL[mode] ?? 'bg-muted')}>
                      {mode}
                    </span>
                    {isDefault && <span className="text-xs text-primary font-medium">● default</span>}
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  {a.model && <p className="text-xs font-mono text-muted-foreground/70">{modelDisplay(a.model)}</p>}
                </div>
                {a.color && (
                  <span className="w-3 h-3 rounded-full shrink-0 mt-1 border" style={{ background: a.color }} />
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-1">Click an agent to set it as the default for new sessions.</p>
        </div>
      )}
    </Section>
  );
}

// ─── 4. Commands ─────────────────────────────────────────────────────────────

function CommandsSection() {
  const { commands, isLoading } = useOpenCodeCommands();

  return (
    <Section title="Commands" icon="⚡">
      {isLoading ? <div className="h-12 bg-muted animate-pulse rounded" /> :
       commands.length === 0 ? (
        <EmptyState icon="⚡" text="No commands found"
          sub="Add commands in .opencode/commands/<name>.md or ~/.config/opencode/commands/" />
      ) : (
        <div className="space-y-1.5">
          {commands.map((c, i) => (
            <div key={c.name ?? i}
              className="flex items-start gap-3 px-3 py-2 rounded-lg bg-muted/40">
              <code className="text-xs font-mono text-primary font-semibold shrink-0">
                /{c.name}
              </code>
              <div className="min-w-0">
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {c.agent && <span className="text-xs text-muted-foreground/70">agent: {c.agent}</span>}
                  {c.model && <span className="text-xs text-muted-foreground/70">model: {c.model}</span>}
                  {c.subtask && <span className="text-xs text-muted-foreground/70">subtask</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs space-y-1">
        <p className="font-medium">Add a command:</p>
        <pre className="font-mono">{`# .opencode/commands/my-cmd.md
---
description: My custom command
agent: build
---
Do something with $ARGUMENTS`}</pre>
      </div>
    </Section>
  );
}

// ─── 5. Skills ────────────────────────────────────────────────────────────────

function SkillsSection() {
  const { skills, isLoading } = useOpenCodeSkills();

  return (
    <Section title="Skills" icon="🎯">
      {isLoading ? <div className="h-12 bg-muted animate-pulse rounded" /> :
       skills.length === 0 ? (
        <EmptyState icon="🎯" text="No skills found"
          sub="Add skills in .opencode/skills/<name>/SKILL.md or ~/.config/opencode/skills/" />
      ) : (
        <div className="space-y-1.5">
          {skills.map((s, i) => (
            <div key={s.name ?? i}
              className="flex items-start gap-3 px-3 py-2 rounded-lg bg-muted/40">
              <span className="text-xs font-mono font-semibold text-primary shrink-0">{s.name}</span>
              <div className="min-w-0">
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                {s.location && <p className="text-xs text-muted-foreground/60 font-mono">{s.location}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs space-y-1">
        <p className="font-medium">Add a skill:</p>
        <pre className="font-mono">{`# .opencode/skills/my-skill/SKILL.md
---
name: my-skill
description: "What this skill does"
---
# Skill instructions...`}</pre>
      </div>
    </Section>
  );
}

// ─── 6. Model / Providers ────────────────────────────────────────────────────

function ModelSection() {
  const { config, refresh: refreshConfig } = useOpenCodeConfig();
  const { providers, isLoading, error } = useOpenCodeProviders();
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  const current = (config?.merged?.model as string) ?? '';

  const save = async () => {
    if (!selected || selected === current) return;
    setSaving(true);
    try { await updateConfig({ model: selected }); await refreshConfig(); setSelected(''); }
    finally { setSaving(false); }
  };

  return (
    <Section title="Model" icon="🧠">
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-5 bg-muted animate-pulse rounded w-48" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      ) : error ? (
        <EmptyState icon="⚠️" text="Failed to load models" sub={`${error}`} />
      ) : providers.length === 0 ? (
        <EmptyState icon="🧠" text="No providers found"
          sub="Start the OpenCode service to see available models." />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Current:</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{current || '(not set)'}</code>
          </div>

          <div className="space-y-1">
            {providers.map((p) => (
              <details key={p.id} className="group">
                <summary className="flex items-center gap-2 cursor-pointer select-none py-1.5 px-2 rounded hover:bg-muted text-sm font-medium list-none">
                  <span className="text-muted-foreground group-open:rotate-90 transition-transform inline-block w-3">▶</span>
                  {p.name ?? p.label ?? p.id}
                  <span className="text-xs text-muted-foreground ml-auto">{p.models.length} models</span>
                </summary>
                <div className="ml-5 mt-0.5 space-y-0.5">
                  {p.models.map((m) => {
                    const modelId = typeof m === 'string' ? m : (m as Record<string, string>).id ?? String(m);
                    const display = typeof m === 'string' ? m : (m as Record<string, string>).name ?? modelId;
                    const isActive = modelId === (selected || current);
                    return (
                      <button key={modelId} onClick={() => setSelected(modelId)}
                        className={cn(
                          'w-full text-left px-3 py-1 rounded text-xs font-mono transition-colors',
                          isActive ? 'bg-primary/10 text-primary font-semibold'
                                   : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                        )}>
                        {isActive && '✓ '}{display}
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>

          {selected && selected !== current && (
            <div className="flex items-center gap-2 pt-1 border-t">
              <span className="text-xs text-muted-foreground">Set to:</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono flex-1">{selected}</code>
              <Button size="sm" onClick={save} disabled={saving}>{saving ? '...' : 'Apply'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected('')}>✕</Button>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── 7. MCP Servers ──────────────────────────────────────────────────────────

const MCP_STATE_COLOR: Record<string, string> = {
  connected: 'bg-emerald-500',
  running:   'bg-emerald-500',
  error:     'bg-red-500',
  stopped:   'bg-muted-foreground/30',
  unknown:   'bg-muted-foreground/30',
};

function McpSection() {
  const { servers, isLoading, refresh } = useMcpStatus();
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (name: string, connected: boolean) => {
    setBusy(name);
    try {
      const ep = connected ? `/api/opencode/mcp/${encodeURIComponent(name)}/disconnect`
                           : `/api/opencode/mcp/${encodeURIComponent(name)}/connect`;
      await apiBackend.post(ep);
      await refresh();
    } catch { /* server may be offline */ }
    finally { setBusy(null); }
  };

  return (
    <Section title="MCP Servers" icon="🔌">
      {isLoading ? <div className="h-12 bg-muted animate-pulse rounded" /> :
       servers.length === 0 ? (
        <EmptyState icon="🔌" text="No MCP servers configured"
          sub='Add servers in .opencode/opencode.json under the "mcp" key.' />
      ) : (
        <div className="space-y-2">
          {servers.map((srv) => {
            const stateKey = (srv.state ?? srv.status ?? 'unknown').toLowerCase();
            const isConnected = stateKey === 'connected' || stateKey === 'running';
            return (
              <div key={srv.name}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', MCP_STATE_COLOR[stateKey] ?? MCP_STATE_COLOR.unknown)} />
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium">{srv.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {srv.type === 'local'  ? `local · ${(srv.command ?? []).join(' ')}` :
                       srv.type === 'remote' ? `remote · ${srv.url ?? ''}` : srv.type ?? ''}
                    </p>
                    {srv.error && <p className="text-xs text-red-500 truncate">{srv.error}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={srv.enabled === false ? 'secondary' : 'outline'} className="text-xs">
                    {stateKey}
                  </Badge>
                  <Button
                    size="sm" variant="ghost" className="text-xs h-6 px-2"
                    onClick={() => toggle(srv.name, isConnected)}
                    disabled={busy === srv.name}
                  >
                    {busy === srv.name ? '...' : isConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ─── 8. Config Editor ─────────────────────────────────────────────────────────

function ConfigSection() {
  const { config, isLoading, refresh, error } = useOpenCodeConfig();
  const [open, setOpen]     = useState(false);
  const [draft, setDraft]   = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  const openEditor = useCallback(() => {
    setDraft(JSON.stringify(config?.project ?? {}, null, 2));
    setMsg(null); setOpen(true);
  }, [config]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      await apiBackend.patch('/api/opencode/config', parsed);
      await refresh();
      setMsg({ ok: true, text: '✓ Saved' });
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof SyntaxError ? `JSON error: ${e.message}` : String(e) });
    } finally { setSaving(false); }
  };

  return (
    <Section title="Config (opencode.json)" icon="📄">
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-4 bg-muted animate-pulse rounded w-64" />
          <div className="h-8 bg-muted animate-pulse rounded w-36" />
        </div>
      ) : error ? (
        <EmptyState icon="⚠️" text="Failed to load config" sub={String(error)} />
      ) : (
        <div className="space-y-3">
          {config?.filePath
            ? <p className="text-xs font-mono text-muted-foreground">{config.filePath}</p>
            : <p className="text-xs text-muted-foreground">No project config found — will create <code className="bg-muted px-1 rounded">.opencode/opencode.json</code></p>
          }

          {!open ? (
            <Button size="sm" variant="outline" onClick={openEditor}>
              ✏️ Edit project config
            </Button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={20}
                spellCheck={false}
                className="w-full rounded-md border bg-muted/30 p-3 font-mono text-xs resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={save} disabled={saving}>{saving ? '...' : '💾 Save'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                {msg && <span className={cn('text-xs', msg.ok ? 'text-emerald-600' : 'text-red-600')}>{msg.text}</span>}
              </div>
            </div>
          )}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground select-none py-1">📖 Full config schema reference</summary>
          <pre className="mt-2 p-3 bg-muted rounded text-[11px] overflow-auto max-h-80 leading-relaxed whitespace-pre-wrap">{CONFIG_SCHEMA_REFERENCE}</pre>
        </details>
      </div>
      )}
    </Section>
  );
}

const CONFIG_SCHEMA_REFERENCE = `{
  "$schema": "https://opencode.ai/config.json",

  // Model selection
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",
  "default_agent": "build",

  // Server
  "server": { "port": 4096, "hostname": "127.0.0.1" },

  // Shell
  "shell": "pwsh",  // or "bash", "zsh"

  // Permissions
  "permission": {
    "bash": { "*": "allow", "git push *": "ask", "rm *": "ask" },
    "edit": "ask",
    "webfetch": "allow"
  },

  // Tools on/off
  "tools": { "bash": true, "edit": true, "write": true },

  // MCP servers
  "mcp": {
    "my-server": {
      "type": "local",
      "command": ["npx", "-y", "@scope/mcp-server"],
      "enabled": true
    },
    "remote-api": {
      "type": "remote",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer {env:MY_TOKEN}" }
    }
  },

  // Context compaction
  "compaction": { "auto": true, "reserved": 10000 },

  // Instruction files (appended to system prompt)
  "instructions": ["AGENTS.md", "docs/dev-guide.md"],

  // Custom agents
  "agent": {
    "my-agent": {
      "mode": "primary",
      "model": "anthropic/claude-opus-4-5",
      "description": "My custom agent"
    }
  },

  // Custom commands (inline; also works as .opencode/commands/<name>.md)
  "command": {
    "deploy": {
      "description": "Deploy to staging",
      "template": "Run deploy script: !\`npm run deploy\`"
    }
  },

  // Skills discovery paths
  "skills": { "paths": [".opencode/skills"] },

  // Auto-update
  "autoupdate": true,
  "snapshot": true
}`;

// ─── Main export ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'service',   label: '🖥️ Service' },
  { id: 'sessions',  label: '💬 Sessions' },
  { id: 'agents',    label: '🤖 Agents' },
  { id: 'commands',  label: '⚡ Commands' },
  { id: 'skills',    label: '🎯 Skills' },
  { id: 'model',     label: '🧠 Model' },
  { id: 'mcp',       label: '🔌 MCP' },
  { id: 'config',    label: '📄 Config' },
] as const;

type TabId = typeof TABS[number]['id'];

export function OpenCodeSettings() {
  const [tab, setTab] = useState<TabId>('service');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">⚙️ OpenCode Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the OpenCode service, sessions, agents, commands, skills, and config.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'service'  && <ServiceSection />}
        {tab === 'sessions' && <SessionsSection />}
        {tab === 'agents'   && <AgentsSection />}
        {tab === 'commands' && <CommandsSection />}
        {tab === 'skills'   && <SkillsSection />}
        {tab === 'model'    && <ModelSection />}
        {tab === 'mcp'      && <McpSection />}
        {tab === 'config'   && <ConfigSection />}
      </div>
    </div>
  );
}
