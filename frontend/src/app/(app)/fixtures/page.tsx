"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Anchor,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  ChevronRight,
  Ship,
  MapPin,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

interface LocalFixture {
  id: string;
  fixture_number: string;
  title: string;
  vessel_name: string;
  load_port: string;
  discharge_port: string;
  deal_type: string;
  charter_type: string;
  stage: string;
  status: string;
  cargo_description: string;
  updated_at: string;
}

let fixtureCounter = 0;

export default function FixturesPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [fixtures, setFixtures] = useState<LocalFixture[]>([]);

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

  const handleCreate = () => {
    if (!form.title.trim()) return;
    setCreating(true);
    fixtureCounter++;
    const id = crypto.randomUUID();
    const newFixture: LocalFixture = {
      id,
      fixture_number: `FIX-${String(fixtureCounter).padStart(4, "0")}`,
      title: form.title.trim(),
      vessel_name: form.vessel_name.trim(),
      load_port: form.load_port.trim(),
      discharge_port: form.discharge_port.trim(),
      deal_type: form.deal_type,
      charter_type: form.charter_type,
      stage: "lead",
      status: "draft",
      cargo_description: form.cargo_description.trim(),
      updated_at: new Date().toISOString(),
    };
    setFixtures((prev) => [newFixture, ...prev]);
    setForm({
      title: "",
      deal_type: "voyage",
      charter_type: "brokered",
      vessel_name: "",
      cargo_description: "",
      load_port: "",
      discharge_port: "",
    });
    setCreating(false);
    setShowCreate(false);
    router.push(`/fixtures/${id}`);
  };

  const filtered = searchQuery.trim()
    ? fixtures.filter(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.fixture_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.vessel_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : fixtures;

  const stageCount = (stage: string) =>
    fixtures.filter((f) => f.stage === stage).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fixtures</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage deal fixtures, terms, recaps, and charter parties
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Fixture
        </button>
      </div>

      {/* Toolbar */}
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
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <Filter className="h-4 w-4" />
          Filters
        </button>
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

      {viewMode === "table" ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-7 gap-4 border-b border-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <div className="col-span-2">Fixture</div>
            <div>Vessel</div>
            <div>Route</div>
            <div>Stage</div>
            <div>Status</div>
            <div className="text-right">Updated</div>
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
                  : "Create a fixture from a chat conversation or manually"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create your first fixture
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((fix) => (
                <button
                  key={fix.id}
                  onClick={() => router.push(`/fixtures/${fix.id}`)}
                  className="grid w-full grid-cols-7 gap-4 px-6 py-3.5 text-left text-sm transition-colors hover:bg-slate-50"
                >
                  <div className="col-span-2 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {fix.title}
                    </p>
                    <p className="text-xs text-slate-400">{fix.fixture_number}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    {fix.vessel_name ? (
                      <>
                        <Ship className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{fix.vessel_name}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                  <div className="flex items-center text-slate-600 truncate">
                    {fix.load_port || fix.discharge_port ? (
                      <span className="truncate">
                        {fix.load_port || "—"} → {fix.discharge_port || "—"}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                  <div>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                        STAGE_COLORS[fix.stage] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {STAGE_LABELS[fix.stage] ?? fix.stage}
                    </span>
                  </div>
                  <div>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        STATUS_COLORS[fix.status] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {fix.status}
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {new Date(fix.updated_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageFixtures = fixtures.filter((f) => f.stage === stage);
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
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {fix.title}
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
                            {fix.load_port || "—"} → {fix.discharge_port || "—"}
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

      {/* Create Fixture Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Fixture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. MV Ocean Star — Santos to Rotterdam"
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
