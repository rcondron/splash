"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Anchor,
  Bot,
  CheckCircle2,
  ChevronDown,
  FileText,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { quintApi } from "@/lib/api";

interface AuditEntry {
  id: string;
  fixture_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  summary: string;
  source_event_id: string | null;
  source_room_id: string | null;
  source_excerpt: string | null;
  performed_by: string | null;
  model: string | null;
  created_at: string | null;
}

const ACTION_ICON: Record<string, typeof History> = {
  fixture_created: Anchor,
  fixture_updated: RefreshCw,
  fixture_dismissed: Trash2,
  term_added: Plus,
  term_updated: Pencil,
  candidate_added: Sparkles,
  issue_detected: AlertTriangle,
  issue_resolved: CheckCircle2,
  insights_regenerated: Sparkles,
  member_added: Users,
  member_removed: Users,
  document_generated: FileText,
};

const ACTION_COLOR: Record<string, string> = {
  fixture_created: "text-blue-500",
  fixture_updated: "text-indigo-500",
  fixture_dismissed: "text-red-500",
  term_added: "text-emerald-500",
  term_updated: "text-amber-500",
  candidate_added: "text-violet-500",
  issue_detected: "text-orange-500",
  issue_resolved: "text-emerald-500",
  insights_regenerated: "text-teal-500",
  member_added: "text-blue-500",
  member_removed: "text-red-500",
  document_generated: "text-blue-500",
};

function actor(entry: AuditEntry): { label: string; isAI: boolean } {
  if (entry.model) return { label: entry.model, isAI: true };
  if (!entry.performed_by) return { label: "system", isAI: true };
  const name = entry.performed_by.replace(/^@/, "").split(":")[0];
  return { label: name || entry.performed_by, isAI: false };
}

function ts(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function tsShort(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function dateHeader(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

type GroupedDay = { date: string; entries: AuditEntry[] };

function groupByDay(entries: AuditEntry[]): GroupedDay[] {
  const map = new Map<string, AuditEntry[]>();
  for (const e of entries) {
    const key = e.created_at
      ? new Date(e.created_at).toDateString()
      : "Unknown";
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([, items]) => ({
    date: dateHeader(items[0].created_at ?? ""),
    entries: items,
  }));
}

export function FixtureAuditTab({ fixtureId }: { fixtureId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await quintApi.get<{ entries: AuditEntry[] }>(
        `/v1/fixtures/${fixtureId}/audit?limit=500`,
      );
      setEntries(res.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const groups = useMemo(() => groupByDay(entries), [entries]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="mt-2 text-xs font-medium text-red-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <History className="mb-4 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            No audit entries yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Changes to terms, issues, and documents will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Audit Log</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {entries.length}
          </span>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
        {groups.map((group, gi) => (
          <div key={gi}>
            {/* Day header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-1.5 backdrop-blur-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.date}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] text-slate-400">
                {group.entries.length}
              </span>
            </div>

            {/* Entries */}
            {group.entries.map((entry) => {
              const Icon =
                ACTION_ICON[entry.action] ?? History;
              const color =
                ACTION_COLOR[entry.action] ?? "text-slate-400";
              const { label: actorLabel, isAI } = actor(entry);
              const isOpen = expanded.has(entry.id);
              const hasDiff = entry.old_value || entry.new_value;

              return (
                <div key={entry.id}>
                  <button
                    type="button"
                    onClick={() => toggle(entry.id)}
                    className="group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-slate-50"
                  >
                    {/* Timestamp */}
                    <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-slate-400">
                      {tsShort(entry.created_at)}
                    </span>

                    {/* Icon */}
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />

                    {/* Actor badge */}
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                        isAI
                          ? "bg-violet-50 text-violet-600"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {isAI ? (
                        <Bot className="h-2.5 w-2.5" />
                      ) : (
                        <User className="h-2.5 w-2.5" />
                      )}
                      {actorLabel}
                    </span>

                    {/* Summary */}
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                      {entry.summary}
                    </span>

                    {/* Field tag */}
                    {entry.field_name && (
                      <span className="hidden shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 sm:inline">
                        {entry.field_name}
                      </span>
                    )}

                    {/* Expand indicator */}
                    {(hasDiff || entry.source_excerpt) && (
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 shrink-0 text-slate-300 transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (hasDiff || entry.source_excerpt) && (
                    <div className="border-t border-slate-50 bg-slate-50/60 px-4 py-2.5 pl-[4.75rem]">
                      {hasDiff && (
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {entry.old_value && (
                            <div className="flex gap-1.5">
                              <span className="font-bold text-red-400">−</span>
                              <span className="text-slate-500 line-through">
                                {entry.old_value}
                              </span>
                            </div>
                          )}
                          {entry.new_value && (
                            <div className="flex gap-1.5">
                              <span className="font-bold text-emerald-500">
                                +
                              </span>
                              <span className="text-slate-700">
                                {entry.new_value}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {entry.source_excerpt && (
                        <p className="mt-1.5 text-[11px] italic text-slate-400 line-clamp-2">
                          &ldquo;{entry.source_excerpt}&rdquo;
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">
                        {ts(entry.created_at)}
                        {entry.model && ` · ${entry.model}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
