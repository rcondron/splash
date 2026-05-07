"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Ban,
  Check,
  Edit3,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { quintApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Term {
  id: string;
  term_key: string;
  term_label: string;
  term_value: string | null;
  value_type: string;
  unit: string | null;
  currency_code: string | null;
  confidence: number | null;
  source_type: string;
  source_excerpt: string | null;
  is_locked: boolean;
  created_at: string | null;
}

interface Candidate {
  id: string;
  term_key: string;
  term_label: string;
  proposed_value: string | null;
  value_type: string;
  unit: string | null;
  currency_code: string | null;
  confidence: number | null;
  evidence_quote: string | null;
  candidate_status: string;
  proposed_by_party: string | null;
  source_event_id: string | null;
}

interface TermsData {
  terms: Term[];
  candidates: Candidate[];
  my_party: string | null;
}

const PARTY_LABEL: Record<string, string> = {
  charterer: "Charterer",
  owner: "Owner",
};

export function FixtureTermsTab({ fixtureId }: { fixtureId: string }) {
  const [data, setData] = useState<TermsData>({
    terms: [],
    candidates: [],
    my_party: null,
  });
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await quintApi.get<TermsData & { success?: boolean }>(
        `/v1/fixtures/${fixtureId}/terms`,
      );
      setData({
        terms: res.terms ?? [],
        candidates: res.candidates ?? [],
        my_party: res.my_party ?? null,
      });
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const handleExtract = async (reextract = false) => {
    setExtracting(true);
    try {
      const endpoint = reextract ? "reextract" : "extract";
      const res = await quintApi.post<TermsData & { success?: boolean }>(
        `/v1/fixtures/${fixtureId}/terms/${endpoint}`,
      );
      setData({
        terms: res.terms ?? [],
        candidates: res.candidates ?? [],
        my_party: data.my_party,
      });
      toast.success(
        reextract
          ? "Terms re-extracted from chat"
          : "Terms extracted from chat",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleAccept = async (candidateId: string) => {
    try {
      await quintApi.post(
        `/v1/fixtures/${fixtureId}/candidates/${candidateId}/accept`,
      );
      void load();
      toast.success("Term accepted and locked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleReject = async (candidateId: string) => {
    try {
      await quintApi.post(
        `/v1/fixtures/${fixtureId}/candidates/${candidateId}/reject`,
      );
      void load();
      toast.success("Term rejected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleCancel = async (candidateId: string) => {
    try {
      await quintApi.post(
        `/v1/fixtures/${fixtureId}/candidates/${candidateId}/cancel`,
      );
      void load();
      toast.success("Proposal cancelled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleSaveEdit = async (termId: string) => {
    if (!editValue.trim()) return;
    try {
      await quintApi.put(`/v1/fixtures/${fixtureId}/terms/${termId}`, {
        value: editValue.trim(),
      });
      setEditingId(null);
      void load();
      toast.success("Term updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleLock = async (termId: string, lock: boolean) => {
    try {
      await quintApi.post(
        `/v1/fixtures/${fixtureId}/terms/${termId}/${lock ? "lock" : "unlock"}`,
      );
      void load();
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (termId: string) => {
    try {
      await quintApi.delete(`/v1/fixtures/${fixtureId}/terms/${termId}`);
      void load();
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading terms…
      </div>
    );
  }

  const hasTerms = data.terms.length > 0;
  const hasCandidates = data.candidates.length > 0;
  const myParty = data.my_party;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Negotiated Terms
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {myParty ? (
              <>
                You are the{" "}
                <span className="font-semibold text-slate-700">
                  {PARTY_LABEL[myParty] ?? myParty}
                </span>
                . Accept terms from the other party, or cancel your own
                proposals.
              </>
            ) : (
              "AI extracts terms from chat. Accept, counter, or reject them."
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {hasTerms && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExtract(true)}
              disabled={extracting}
            >
              {extracting ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Re-extract
            </Button>
          )}
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => void handleExtract(false)}
            disabled={extracting}
          >
            {extracting ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3.5 w-3.5" />
            )}
            Extract from chat
          </Button>
        </div>
      </div>

      {/* Accepted / locked terms */}
      {hasTerms ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-12 gap-3 border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <div className="col-span-3">Term</div>
            <div className="col-span-4">Value</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-center">Conf.</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-slate-50">
            {data.terms.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="col-span-3">
                  <p className="font-medium text-slate-900">{t.term_label}</p>
                  <p className="font-mono text-[10px] text-slate-400">
                    {t.term_key}
                  </p>
                </div>
                <div className="col-span-4">
                  {editingId === t.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit(t.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => void handleSaveEdit(t.id)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-800">
                      {t.term_value}
                      {t.unit && (
                        <span className="ml-1 text-xs text-slate-400">
                          {t.unit}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  {t.is_locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <Lock className="h-2.5 w-2.5" />
                      Agreed
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Draft
                    </span>
                  )}
                </div>
                <div className="col-span-1 text-center">
                  {t.confidence != null && (
                    <span className="text-xs text-slate-500">
                      {Math.round(t.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {t.is_locked ? (
                    <button
                      onClick={() => void handleLock(t.id, false)}
                      className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                    >
                      Unlock
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => void handleLock(t.id, true)}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(t.id);
                          setEditValue(t.term_value ?? "");
                        }}
                        className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Amend
                      </button>
                      <button
                        onClick={() => void handleDelete(t.id)}
                        className="rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] font-medium text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !hasCandidates ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            No terms extracted yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Click &quot;Extract from chat&quot; to pull terms from the
            conversation, or they&apos;ll be extracted automatically as members
            negotiate.
          </p>
        </div>
      ) : null}

      {/* Candidates — party-aware actions */}
      {hasCandidates && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Proposed Terms — review &amp; respond
          </h3>
          <div className="space-y-2">
            {data.candidates.map((c) => {
              const isMine =
                myParty != null && c.proposed_by_party === myParty;
              const proposerLabel = c.proposed_by_party
                ? PARTY_LABEL[c.proposed_by_party] ?? c.proposed_by_party
                : null;

              return (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    isMine
                      ? "border-slate-200 bg-slate-50/50"
                      : "border-blue-100 bg-blue-50/50",
                  )}
                >
                  <Sparkles
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isMine ? "text-slate-400" : "text-blue-500",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {c.term_label}
                        <span className="ml-2 font-normal text-slate-700">
                          {c.proposed_value}
                          {c.unit && (
                            <span className="ml-1 text-xs text-slate-400">
                              {c.unit}
                            </span>
                          )}
                        </span>
                      </p>
                      {proposerLabel && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            isMine
                              ? "bg-slate-200 text-slate-600"
                              : "bg-blue-100 text-blue-700",
                          )}
                        >
                          {isMine ? "Your proposal" : `From ${proposerLabel}`}
                        </span>
                      )}
                    </div>
                    {c.evidence_quote && (
                      <div className="mt-1.5 flex items-start gap-1.5 rounded border border-slate-200 bg-white/70 px-2 py-1.5">
                        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                        <p className="text-xs italic text-slate-500 line-clamp-2">
                          &ldquo;{c.evidence_quote}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {isMine ? (
                      /* Proposer can only cancel */
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs text-slate-500"
                        onClick={() => void handleCancel(c.id)}
                      >
                        <Ban className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    ) : (
                      /* Receiver can accept, reject, or counter */
                      <>
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700"
                          onClick={() => void handleAccept(c.id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs text-slate-500"
                          onClick={() => void handleReject(c.id)}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
