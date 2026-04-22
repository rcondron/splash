"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { quintApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Issue {
  id: string;
  issue_type: string;
  severity: string;
  title: string;
  description: string;
  related_term_key: string | null;
  status: string;
  resolution: string | null;
  created_by: string | null;
  model: string | null;
  created_at: string | null;
}

interface Comment {
  id: string;
  issue_id: string;
  author: string;
  body: string;
  created_at: string | null;
}

const SEV_STYLES: Record<string, string> = {
  critical: "border-red-200 bg-red-50/50",
  high: "border-orange-200 bg-orange-50/50",
  medium: "border-amber-100 bg-amber-50/30",
  low: "border-slate-200 bg-slate-50/50",
};

const SEV_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const TYPE_LABEL: Record<string, string> = {
  conflicting_term: "Conflict",
  missing_term: "Missing",
  recap_mismatch: "Mismatch",
  ambiguous_language: "Ambiguous",
  action_required: "Action",
  risk_flag: "Risk",
  general: "General",
};

export function FixtureIssuesTabReal({ fixtureId }: { fixtureId: string }) {
  const { matrixUserId } = useAuthStore();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    severity: "medium",
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = showAll ? "?all=true" : "";
      const res = await quintApi.get<{ issues: Issue[]; success?: boolean }>(
        `/v1/fixtures/${fixtureId}/issues${q}`,
      );
      setIssues(res.issues ?? []);
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  }, [fixtureId, showAll]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const handleDetect = async (redetect = false) => {
    setDetecting(true);
    try {
      const endpoint = redetect ? "redetect" : "detect";
      const res = await quintApi.post<{ issues: Issue[]; success?: boolean }>(
        `/v1/fixtures/${fixtureId}/issues/${endpoint}`,
      );
      setIssues(res.issues ?? []);
      toast.success(
        redetect ? "Issues re-detected" : "Issues detected from chat",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setDetecting(false);
    }
  };

  const handleResolve = async (issueId: string) => {
    try {
      await quintApi.post(`/v1/issues/${issueId}/resolve`, { resolution: "" });
      void load();
      toast.success("Issue resolved");
    } catch {
      /* ignore */
    }
  };

  const handleDismiss = async (issueId: string) => {
    try {
      await quintApi.post(`/v1/issues/${issueId}/dismiss`);
      void load();
    } catch {
      /* ignore */
    }
  };

  const loadComments = async (issueId: string) => {
    try {
      const res = await quintApi.get<{ comments: Comment[] }>(
        `/v1/issues/${issueId}/comments`,
      );
      setComments((prev) => ({ ...prev, [issueId]: res.comments ?? [] }));
    } catch {
      /* ignore */
    }
  };

  const handleComment = async (issueId: string) => {
    if (!commentText.trim()) return;
    try {
      await quintApi.post(`/v1/issues/${issueId}/comments`, {
        body: commentText.trim(),
      });
      setCommentText("");
      void loadComments(issueId);
    } catch {
      /* ignore */
    }
  };

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.description.trim()) return;
    setCreating(true);
    try {
      await quintApi.post(`/v1/fixtures/${fixtureId}/issues`, createForm);
      setShowCreate(false);
      setCreateForm({ title: "", description: "", severity: "medium" });
      void load();
      toast.success("Issue created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const toggle = (issueId: string) => {
    if (expandedId === issueId) {
      setExpandedId(null);
    } else {
      setExpandedId(issueId);
      if (!comments[issueId]) void loadComments(issueId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading issues…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Issues</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Discrepancies and action items detected by AI or raised manually.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Hide resolved" : "Show all"}
          </Button>
          {issues.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleDetect(true)}
              disabled={detecting}
            >
              {detecting ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Re-detect
            </Button>
          )}
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => void handleDetect(false)}
            disabled={detecting}
          >
            {detecting ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3.5 w-3.5" />
            )}
            Detect from chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <Input
            placeholder="Issue title"
            value={createForm.title}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, title: e.target.value }))
            }
            autoFocus
          />
          <textarea
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"
            rows={3}
            placeholder="Description…"
            value={createForm.description}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
              value={createForm.severity}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, severity: e.target.value }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => void handleCreate()}
              disabled={creating}
            >
              {creating && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Create
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Issue list */}
      {issues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            No open issues
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Click &quot;Detect from chat&quot; to scan for discrepancies.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const isExpanded = expandedId === issue.id;
            const issueComments = comments[issue.id] ?? [];
            return (
              <div
                key={issue.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  SEV_STYLES[issue.severity] ?? SEV_STYLES.low,
                  issue.status === "resolved" && "opacity-60",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(issue.id)}
                  className="flex w-full items-start gap-3 p-3 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          SEV_BADGE[issue.severity] ?? SEV_BADGE.low,
                        )}
                      >
                        {issue.severity}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {TYPE_LABEL[issue.issue_type] ?? issue.issue_type}
                      </span>
                      {issue.created_by === "ai" && (
                        <Sparkles className="h-3 w-3 text-blue-500" />
                      )}
                      {issue.status === "resolved" && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {issue.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                      {issue.description}
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 pl-10 space-y-3">
                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {issue.description}
                    </p>
                    {issue.related_term_key && (
                      <p className="text-xs text-slate-500">
                        Related term:{" "}
                        <span className="font-mono">{issue.related_term_key}</span>
                      </p>
                    )}

                    {issue.status !== "resolved" &&
                      issue.status !== "dismissed" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700"
                            onClick={() => void handleResolve(issue.id)}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-slate-500"
                            onClick={() => void handleDismiss(issue.id)}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Dismiss
                          </Button>
                        </div>
                      )}

                    {/* Comments */}
                    <div className="space-y-2 pt-2">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <MessageSquare className="h-3 w-3" />
                        Comments ({issueComments.length})
                      </p>
                      {issueComments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-md bg-white/70 p-2 text-xs"
                        >
                          <span className="font-medium text-slate-700">
                            {c.author === matrixUserId ? "You" : c.author}
                          </span>
                          <span className="ml-2 text-slate-400">
                            {c.created_at
                              ? new Date(c.created_at).toLocaleString()
                              : ""}
                          </span>
                          <p className="mt-0.5 text-slate-600">{c.body}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          className="h-7 text-xs"
                          placeholder="Add a comment…"
                          value={expandedId === issue.id ? commentText : ""}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              void handleComment(issue.id);
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-7 shrink-0 bg-blue-600 px-2 hover:bg-blue-700"
                          onClick={() => void handleComment(issue.id)}
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
