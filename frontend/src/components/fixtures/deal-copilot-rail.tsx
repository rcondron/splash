"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  PanelRightClose,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { quintApi, sendMatrixRoomTextMessage } from "@/lib/api";

interface DealCopilotRailProps {
  fixtureId: string;
  activeTab: string;
  onClose: () => void;
  chatRoomId: string | null;
  chatRoomError: string | null;
}

interface Insight {
  id: string;
  fixture_id: string;
  insight_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  why_it_matters?: string | null;
  recommended_action?: string | null;
  suggested_chat_message?: string | null;
  related_term_key?: string | null;
  confidence?: number | null;
  source_excerpt?: string | null;
  status: string;
  model?: string | null;
  created_at?: string | null;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  low: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
};

type SectionKey = "gaps" | "ambiguities" | "inconsistencies" | "actions";

const SECTION_META: {
  key: SectionKey;
  label: string;
  icon: typeof Target;
  types: string[];
  color: string;
}[] = [
  {
    key: "gaps",
    label: "Gaps to Close",
    icon: Target,
    types: ["missing_term", "low_confidence_extraction"],
    color: "text-orange-600",
  },
  {
    key: "ambiguities",
    label: "Ambiguities",
    icon: HelpCircle,
    types: ["ambiguous_term"],
    color: "text-amber-600",
  },
  {
    key: "inconsistencies",
    label: "Inconsistencies",
    icon: AlertTriangle,
    types: ["inconsistent_term", "document_mismatch", "commercial_risk"],
    color: "text-red-600",
  },
  {
    key: "actions",
    label: "Suggested Next Actions",
    icon: Lightbulb,
    types: ["followup_suggestion"],
    color: "text-blue-600",
  },
];

function bucketInsights(insights: Insight[]): Record<SectionKey, Insight[]> {
  const buckets: Record<SectionKey, Insight[]> = {
    gaps: [],
    ambiguities: [],
    inconsistencies: [],
    actions: [],
  };
  for (const insight of insights) {
    const section = SECTION_META.find((s) => s.types.includes(insight.insight_type));
    if (section) {
      buckets[section.key].push(insight);
    } else {
      buckets.actions.push(insight);
    }
  }
  return buckets;
}

export function DealCopilotRail({
  fixtureId,
  activeTab,
  onClose,
  chatRoomId,
  chatRoomError,
}: DealCopilotRailProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await quintApi.get<{ insights: Insight[] }>(
        `/v1/fixtures/${fixtureId}/insights`,
      );
      setInsights(res.insights ?? []);
      setLastRunAt(new Date().toLocaleTimeString());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load insights");
    }
  }, [fixtureId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInsights([]);
    setLoadError(null);

    void (async () => {
      try {
        const res = await quintApi.get<{ insights: Insight[] }>(
          `/v1/fixtures/${fixtureId}/insights`,
        );
        if (cancelled) return;

        const ins = res.insights ?? [];

        if (ins.length > 0) {
          setInsights(ins);
          setLastRunAt(new Date().toLocaleTimeString());
          setLoading(false);
          return;
        }

        // No insights yet — auto-generate (keep loading spinner active)
        try {
          const gen = await quintApi.post<{ insights: Insight[] }>(
            `/v1/fixtures/${fixtureId}/insights/generate`,
          );
          if (!cancelled) {
            setInsights(gen.insights ?? []);
            setLastRunAt(new Date().toLocaleTimeString());
          }
        } catch {
          // generation can fail if chat has too few messages — that's OK
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fixtureId]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    setLoadError(null);
    try {
      const res = await quintApi.post<{ insights: Insight[] }>(
        `/v1/fixtures/${fixtureId}/insights/reanalyze`,
      );
      setInsights(res.insights ?? []);
      setLastRunAt(new Date().toLocaleTimeString());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Reanalyze failed");
    } finally {
      setReanalyzing(false);
    }
  };

  const handleDismiss = (insightId: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== insightId));
    void quintApi.post(`/v1/insights/${insightId}/dismiss`).catch(() => {
      fetchInsights();
    });
  };

  const buckets = bucketInsights(insights);
  const totalOpen = insights.length;

  return (
    <div className="flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-900">
            Deal Copilot
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void handleReanalyze()}
            disabled={reanalyzing || loading}
            title="Reanalyze deal"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40"
          >
            <RefreshCw className={cn("h-4 w-4", reanalyzing && "animate-spin")} />
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>
      {chatRoomError && (
        <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
          Chat unavailable: {chatRoomError}
        </p>
      )}
      {loadError && (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-[11px] text-red-800">
          {loadError}
        </p>
      )}

      {/* Loading state */}
      {(loading || reanalyzing) && insights.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <p className="text-xs text-slate-500">
            {reanalyzing ? "Analyzing deal with AI…" : "Loading insights…"}
          </p>
        </div>
      ) : (
        /* Scrollable body */
        <div className="flex-1 overflow-y-auto">
          {reanalyzing && insights.length > 0 && (
            <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
              <span className="text-[11px] text-blue-700">Reanalyzing deal…</span>
            </div>
          )}

          {SECTION_META.map((section) => {
            const Icon = section.icon;
            const items = buckets[section.key];
            const count = items.length;
            return (
              <div key={section.key} className="border-b border-slate-100 last:border-b-0">
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <Icon className={cn("h-4 w-4", section.color)} />
                  <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {section.label}
                  </span>
                  {count > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600">
                      {count}
                    </span>
                  )}
                </div>
                <div className="space-y-2 px-3 pb-3">
                  {items.length === 0 ? (
                    <p className="py-2 text-center text-xs text-slate-400">
                      None detected
                    </p>
                  ) : (
                    items.map((insight) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        chatRoomId={chatRoomId}
                        chatRoomError={chatRoomError}
                        onDismiss={() => handleDismiss(insight.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* AI Health */}
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                AI Health
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Last AI run</span>
                <span className="text-slate-400">{lastRunAt ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Unresolved items</span>
                <span className="font-medium">{totalOpen}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  chatRoomId,
  chatRoomError,
  onDismiss,
}: {
  insight: Insight;
  chatRoomId: string | null;
  chatRoomError: string | null;
  onDismiss: () => void;
}) {
  const sev = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.low;
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);

  useEffect(() => {
    if (draftOpen && insight.suggested_chat_message) {
      setDraftText(insight.suggested_chat_message);
    }
  }, [draftOpen, insight.suggested_chat_message]);

  const openDraft = () => {
    setSendError(null);
    setDraftOpen(true);
    setDraftText(insight.suggested_chat_message ?? "");
  };

  const cancelDraft = () => {
    setDraftOpen(false);
    setSendError(null);
  };

  const sendDraft = async () => {
    const body = draftText.trim();
    if (!body || !chatRoomId) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMatrixRoomTextMessage(chatRoomId, body);
      setDraftOpen(false);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const canSend = !!chatRoomId && !chatRoomError && draftText.trim().length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-100 p-3 transition-colors hover:border-slate-200",
        sev.bg,
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", sev.dot)} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium leading-tight", sev.text)}>
            {insight.title}
          </p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            {insight.description}
          </p>
          {insight.why_it_matters && (
            <p className="mt-1.5 text-[11px] italic text-slate-400">
              {insight.why_it_matters}
            </p>
          )}
          {insight.related_term_key && (
            <span className="mt-1.5 inline-block rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
              {insight.related_term_key}
            </span>
          )}

          {/* Actions */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {insight.suggested_chat_message && (
              <button
                type="button"
                onClick={openDraft}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700"
              >
                <MessageSquare className="h-3 w-3" />
                Draft message
              </button>
            )}
            {insight.source_excerpt && (
              <button
                type="button"
                onClick={() => setSourceOpen(!sourceOpen)}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                <Search className="h-3 w-3" />
                {sourceOpen ? "Hide source" : "View source"}
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <X className="h-3 w-3" />
              Dismiss
            </button>
          </div>

          {/* Source excerpt */}
          {sourceOpen && insight.source_excerpt && (
            <div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
              <p className="text-[11px] italic text-slate-600 leading-relaxed">
                &ldquo;{insight.source_excerpt}&rdquo;
              </p>
            </div>
          )}

          {/* Draft message composer */}
          {draftOpen && (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={4}
                disabled={sending}
                placeholder="Message to send in chat…"
                className="w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-300 focus:bg-white disabled:opacity-60"
              />
              {!chatRoomId && !chatRoomError && (
                <p className="text-[10px] text-slate-400">Loading room…</p>
              )}
              {sendError && (
                <p className="text-[10px] text-red-600">{sendError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDraft}
                  disabled={sending}
                  className="rounded-md px-2.5 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void sendDraft()}
                  disabled={sending || !canSend}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
        {insight.confidence != null && (
          <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200">
            {Math.round(insight.confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
