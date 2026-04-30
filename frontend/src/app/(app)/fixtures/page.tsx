"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Anchor,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Ship,
  MapPin,
  Loader2,
  Sparkles,
  LogOut,
  X,
  MoreVertical,
  Lock,
  Archive,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { quintApi } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";

type ViewMode = "table" | "kanban";

const STAGES = [
  "lead",
  "quoted",
  "negotiating",
  "recap_pending",
  "recap_issued",
  "cp_drafting",
  "cp_review",
  "fixed",
  "execution",
  "closed",
] as const;

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  quoted: "Quoted",
  negotiating: "Negotiating",
  recap_pending: "Recap Pending",
  recap_issued: "Recap Issued",
  cp_drafting: "CP Drafting",
  cp_review: "CP Review",
  fixed: "Fixed",
  execution: "Execution",
  closed: "Closed",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-slate-100 text-slate-600",
  quoted: "bg-blue-100 text-blue-700",
  negotiating: "bg-amber-100 text-amber-700",
  recap_pending: "bg-orange-100 text-orange-700",
  recap_issued: "bg-purple-100 text-purple-700",
  cp_drafting: "bg-indigo-100 text-indigo-700",
  cp_review: "bg-cyan-100 text-cyan-700",
  fixed: "bg-emerald-100 text-emerald-700",
  execution: "bg-teal-100 text-teal-700",
  closed: "bg-slate-200 text-slate-500",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  negotiating: "bg-amber-100 text-amber-700",
  fixed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-600",
  disputed: "bg-red-100 text-red-700",
};

interface Fixture {
  id: string;
  room_id: string;
  fixture_number: string;
  title: string;
  vessel_name: string | null;
  cargo_description: string | null;
  load_port: string | null;
  discharge_port: string | null;
  deal_type: string;
  charter_type: string;
  stage: string;
  status: string;
  source_type: string;
  confidence: number | null;
  source_excerpt: string | null;
  reasoning: string | null;
  created_at: string | null;
  updated_at: string | null;
  finalized_by_1: string | null;
  finalized_by_2: string | null;
  finalized_at: string | null;
  archived_at: string | null;
}

interface ListFixturesResponse {
  success: boolean;
  fixtures?: Fixture[];
}

interface CreateFixtureResponse {
  success: boolean;
  fixture?: Fixture;
}

export default function FixturesPage() {
  const router = useRouter();
  const matrixUserId = useAuthStore((s) => s.matrixUserId);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    deal_type: "voyage",
    charter_type: "brokered",
    vessel_name: "",
    cargo_description: "",
    load_port: "",
    discharge_port: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showFinalized, setShowFinalized] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [recentAiId, setRecentAiId] = useState<string | null>(null);
  const recentAiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (showFinalized) params.set("include_finalized", "1");
      if (showArchived) params.set("include_archived", "1");
      const qs = params.toString();
      const res = await quintApi.get<ListFixturesResponse>(
        `/v1/fixtures${qs ? `?${qs}` : ""}`,
      );
      setFixtures(res.fixtures ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load fixtures");
    } finally {
      setLoading(false);
    }
  }, [showFinalized, showArchived]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let sock: ReturnType<typeof getSocket> | null = null;
    try {
      sock = getSocket();
    } catch {
      return;
    }
    const onFixtureCreated = (fx: Fixture) => {
      setFixtures((prev) => {
        if (prev.some((p) => p.id === fx.id)) return prev;
        return [fx, ...prev];
      });
      setRecentAiId(fx.id);
      if (recentAiTimer.current) clearTimeout(recentAiTimer.current);
      recentAiTimer.current = setTimeout(() => setRecentAiId(null), 10000);
    };
    sock.on("fixture_created", onFixtureCreated);
    return () => {
      sock?.off("fixture_created", onFixtureCreated);
      if (recentAiTimer.current) clearTimeout(recentAiTimer.current);
    };
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await quintApi.post<CreateFixtureResponse>("/v1/fixtures", {
        title: form.title.trim(),
        deal_type: form.deal_type,
        charter_type: form.charter_type,
        vessel_name: form.vessel_name.trim() || null,
        cargo_description: form.cargo_description.trim() || null,
        load_port: form.load_port.trim() || null,
        discharge_port: form.discharge_port.trim() || null,
      });
      const fx = res.fixture;
      if (fx) {
        setFixtures((prev) => [fx, ...prev.filter((p) => p.id !== fx.id)]);
        setShowCreate(false);
        setForm({
          title: "",
          deal_type: "voyage",
          charter_type: "brokered",
          vessel_name: "",
          cargo_description: "",
          load_port: "",
          discharge_port: "",
        });
        router.push(`/fixtures/${fx.id}`);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not create fixture");
    } finally {
      setCreating(false);
    }
  };

  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null);
  const [leavingFixture, setLeavingFixture] = useState(false);
  const [confirmFinalizeId, setConfirmFinalizeId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const handleLeaveFixture = async (fixtureId: string) => {
    setLeavingFixture(true);
    try {
      await quintApi.delete(`/v1/fixtures/${fixtureId}`);
      setFixtures((prev) => prev.filter((f) => f.id !== fixtureId));
      toast.success("You left this fixture — it stays for other members.");
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to leave fixture");
    } finally {
      setLeavingFixture(false);
      setConfirmLeaveId(null);
    }
  };

  const handleFinalize = async (fixtureId: string) => {
    setFinalizing(true);
    try {
      const res = await quintApi.post<{
        outcome: string;
        fixture: Fixture | null;
      }>(`/v1/fixtures/${fixtureId}/finalize`);
      if (res.outcome === "finalized") {
        setFixtures((prev) => prev.filter((f) => f.id !== fixtureId));
        toast.success("Fixture finalized & closed — detached from chat.");
      } else if (res.outcome === "requested") {
        if (res.fixture) {
          setFixtures((prev) =>
            prev.map((f) => (f.id === fixtureId ? { ...f, ...res.fixture! } : f)),
          );
        }
        toast.success("Finalize requested — waiting for the other principal to confirm.");
      } else if (res.outcome === "already_requested") {
        toast("You already requested finalization — the other principal must confirm.");
      } else if (res.outcome === "already_finalized") {
        toast("This fixture is already finalized.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not finalize");
    } finally {
      setFinalizing(false);
      setConfirmFinalizeId(null);
    }
  };

  const handleArchiveToggle = async (fixtureId: string, isArchived: boolean) => {
    try {
      if (isArchived) {
        await quintApi.post(`/v1/fixtures/${fixtureId}/unarchive`);
        setFixtures((prev) =>
          prev.map((f) => (f.id === fixtureId ? { ...f, archived_at: null } : f)),
        );
        toast.success("Fixture unarchived.");
      } else {
        await quintApi.post(`/v1/fixtures/${fixtureId}/archive`);
        setFixtures((prev) => prev.filter((f) => f.id !== fixtureId));
        toast.success("Fixture archived.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update archive status");
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return fixtures;
    return fixtures.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.fixture_number.toLowerCase().includes(q) ||
        (f.vessel_name ?? "").toLowerCase().includes(q) ||
        (f.cargo_description ?? "").toLowerCase().includes(q),
    );
  }, [fixtures, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fixtures</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage deal fixtures, terms, recaps, and charter parties
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setShowCreate(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Fixture
        </button>
      </div>

      {listError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {listError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search fixtures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              (showFinalized || showArchived)
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}>
              <Filter className="h-4 w-4" />
              Filters
              {(showFinalized || showArchived) && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {(showFinalized ? 1 : 0) + (showArchived ? 1 : 0)}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem
              onClick={() => setShowFinalized((v) => !v)}
              className="gap-2"
            >
              <div className={cn(
                "flex h-4 w-4 items-center justify-center rounded border",
                showFinalized
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white",
              )}>
                {showFinalized && <CheckCircle2 className="h-3 w-3" />}
              </div>
              Show Finalized
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowArchived((v) => !v)}
              className="gap-2"
            >
              <div className={cn(
                "flex h-4 w-4 items-center justify-center rounded border",
                showArchived
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white",
              )}>
                {showArchived && <CheckCircle2 className="h-3 w-3" />}
              </div>
              Show Archived
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "table"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "kanban"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-8 gap-4 border-b border-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <div className="col-span-2">Fixture</div>
            <div>Vessel</div>
            <div>Route</div>
            <div>Stage</div>
            <div>Status</div>
            <div className="text-right">Updated</div>
            <div></div>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Anchor className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {searchQuery ? "No fixtures match your search" : "No fixtures yet"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {searchQuery
                  ? "Try a different search term"
                  : "Start a negotiation in chat \u2014 the AI will open a draft fixture here automatically"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create manually
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((fix) => {
                const isRecent = recentAiId === fix.id;
                const isAi = fix.source_type === "ai_extracted";
                return (
                  <div
                    key={fix.id}
                    className={cn(
                      "grid w-full grid-cols-8 gap-4 px-6 py-3.5 text-left text-sm transition-colors hover:bg-slate-50",
                      isRecent && "bg-blue-50/50",
                    )}
                  >
                    <button
                      onClick={() => router.push(`/fixtures/${fix.id}`)}
                      className="col-span-2 min-w-0 text-left"
                    >
                      <p className="flex items-center gap-2 font-medium text-slate-900">
                        <span className="truncate">{fix.title}</span>
                        {isAi && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            <Sparkles className="h-2.5 w-2.5" /> AI
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {fix.fixture_number}
                        {typeof fix.confidence === "number" && (
                          <span className="ml-2 text-slate-400">
                            {Math.round(fix.confidence * 100)}% conf.
                          </span>
                        )}
                      </p>
                    </button>
                    <button
                      onClick={() => router.push(`/fixtures/${fix.id}`)}
                      className="flex items-center gap-1.5 text-slate-600 text-left"
                    >
                      {fix.vessel_name ? (
                        <>
                          <Ship className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{fix.vessel_name}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">{"\u2014"}</span>
                      )}
                    </button>
                    <button
                      onClick={() => router.push(`/fixtures/${fix.id}`)}
                      className="flex items-center text-slate-600 truncate text-left"
                    >
                      {fix.load_port || fix.discharge_port ? (
                        <span className="truncate">
                          {fix.load_port || "\u2014"}
                          {" \u2192 "}
                          {fix.discharge_port || "\u2014"}
                        </span>
                      ) : (
                        <span className="text-slate-400">{"\u2014"}</span>
                      )}
                    </button>
                    <div className="flex items-center">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                          STAGE_COLORS[fix.stage] ?? "bg-slate-100 text-slate-600",
                        )}
                      >
                        {STAGE_LABELS[fix.stage] ?? fix.stage}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                          STATUS_COLORS[fix.status] ?? "bg-slate-100 text-slate-600",
                        )}
                      >
                        {fix.status}
                      </span>
                      {fix.finalized_by_1 && !fix.finalized_at && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                          title="Finalization pending — one principal has confirmed"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          1/2
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-end text-xs text-slate-400">
                      {fix.updated_at
                        ? new Date(fix.updated_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })
                        : "\u2014"}
                    </div>
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {(() => {
                            const iAmInitiator = fix.finalized_by_1 === matrixUserId;
                            const pendingOther = !!fix.finalized_by_1 && !fix.finalized_at;
                            const canConfirm = pendingOther && !iAmInitiator;
                            return (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (iAmInitiator && pendingOther) {
                                    toast("Waiting for the other principal to confirm.");
                                    return;
                                  }
                                  setConfirmFinalizeId(fix.id);
                                }}
                                disabled={!!fix.finalized_at || (pendingOther && iAmInitiator)}
                                className="gap-2"
                              >
                                {fix.finalized_at ? (
                                  <>
                                    <Lock className="h-4 w-4 text-emerald-500" />
                                    Finalized
                                  </>
                                ) : canConfirm ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-amber-500" />
                                    Confirm Finalize
                                  </>
                                ) : iAmInitiator && pendingOther ? (
                                  <>
                                    <Lock className="h-4 w-4 text-slate-400" />
                                    Awaiting Confirmation
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4" />
                                    Finalize &amp; Close
                                  </>
                                )}
                              </DropdownMenuItem>
                            );
                          })()}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleArchiveToggle(fix.id, !!fix.archived_at);
                            }}
                            className="gap-2"
                          >
                            <Archive className="h-4 w-4" />
                            {fix.archived_at ? "Unarchive" : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmLeaveId(fix.id);
                            }}
                            className="gap-2 text-red-600 focus:text-red-600"
                          >
                            <LogOut className="h-4 w-4" />
                            Leave
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageFixtures = filtered.filter((f) => f.stage === stage);
            return (
              <div key={stage} className="w-64 shrink-0">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STAGE_COLORS[stage],
                    )}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="text-xs text-slate-400">
                    {stageFixtures.length}
                  </span>
                </div>
                {stageFixtures.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-center text-xs text-slate-400">
                      No fixtures
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stageFixtures.map((fix) => (
                      <button
                        key={fix.id}
                        onClick={() => router.push(`/fixtures/${fix.id}`)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300"
                      >
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          <span className="truncate">{fix.title}</span>
                          {fix.source_type === "ai_extracted" && (
                            <Sparkles className="h-3 w-3 text-blue-500" />
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {fix.fixture_number}
                        </p>
                        {fix.vessel_name && (
                          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                            <Ship className="h-3 w-3" />
                            {fix.vessel_name}
                          </div>
                        )}
                        {(fix.load_port || fix.discharge_port) && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            {fix.load_port || "\u2014"}
                            {" \u2192 "}
                            {fix.discharge_port || "\u2014"}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Leave fixture — removes only your membership */}
      <Dialog
        open={!!confirmLeaveId}
        onOpenChange={(open) => { if (!open) setConfirmLeaveId(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave fixture</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            You will stop seeing this fixture in your list. Other members keep
            access; the fixture and copilot data are not deleted for them.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmLeaveId(null)}
              disabled={leavingFixture}
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmLeaveId && void handleLeaveFixture(confirmLeaveId)}
              disabled={leavingFixture}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {leavingFixture ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Leave fixture
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize & Close confirmation */}
      <Dialog
        open={!!confirmFinalizeId}
        onOpenChange={(open) => { if (!open) setConfirmFinalizeId(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Finalize &amp; Close
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const fx = fixtures.find((f) => f.id === confirmFinalizeId);
            const pendingOther = !!fx?.finalized_by_1 && !fx?.finalized_at;
            const iAmInitiator = fx?.finalized_by_1 === matrixUserId;
            const canConfirm = pendingOther && !iAmInitiator;
            return (
              <>
                {canConfirm ? (
                  <p className="text-sm text-slate-600">
                    The other principal has already requested to finalize{" "}
                    <span className="font-medium">{fx?.title}</span>. By confirming, you
                    will lock all fixture data, detach it from chat, and mark it as closed.
                    This cannot be undone.
                  </p>
                ) : (
                  <p className="text-sm text-slate-600">
                    This will send a finalization request to the chat room. The other
                    principal must also confirm before the fixture is locked and detached
                    from chat. Once finalized, no further edits can be made.
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmFinalizeId(null)}
                    disabled={finalizing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => confirmFinalizeId && void handleFinalize(confirmFinalizeId)}
                    disabled={finalizing}
                    className={canConfirm
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                    }
                  >
                    {finalizing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : canConfirm ? (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    {canConfirm ? "Confirm & Finalize" : "Request Finalize"}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Fixture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {createError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. MV Ocean Star \u2014 Santos to Rotterdam"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Deal Type
                </label>
                <select
                  value={form.deal_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deal_type: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"
                >
                  <option value="voyage">Voyage Charter</option>
                  <option value="time_charter">Time Charter</option>
                  <option value="bareboat">Bareboat</option>
                  <option value="coa">COA</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Charter Type
                </label>
                <select
                  value={form.charter_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, charter_type: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"
                >
                  <option value="brokered">Brokered</option>
                  <option value="owner_to_charterer">Owner to Charterer</option>
                  <option value="internal_reference">Internal Reference</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Vessel Name
              </label>
              <Input
                value={form.vessel_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vessel_name: e.target.value }))
                }
                placeholder="e.g. MV Ocean Star"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Cargo Description
              </label>
              <Input
                value={form.cargo_description}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cargo_description: e.target.value,
                  }))
                }
                placeholder="e.g. 50,000 MT Soybeans"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Load Port
                </label>
                <Input
                  value={form.load_port}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, load_port: e.target.value }))
                  }
                  placeholder="e.g. Santos"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Discharge Port
                </label>
                <Input
                  value={form.discharge_port}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discharge_port: e.target.value }))
                  }
                  placeholder="e.g. Rotterdam"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !form.title.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Fixture
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
