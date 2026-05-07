"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Anchor,
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  Loader2,
  MapPin,
  Ship,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { quintApi } from "@/lib/api";

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
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Term {
  id: string;
  term_key: string;
  term_label: string;
  term_value: string | null;
  unit: string | null;
  is_locked: boolean;
}

interface Candidate {
  id: string;
  term_label: string;
  proposed_value: string | null;
}

interface Insight {
  id: string;
  severity: string;
  title: string;
}

interface OverviewData {
  fixture: Fixture | null;
  terms: Term[];
  candidates: Candidate[];
  insights: Insight[];
}

const STAGE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  negotiating: { label: "Negotiating", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  on_subs: { label: "On Subs", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  fixed: { label: "Fixed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const DEAL_LABELS: Record<string, string> = {
  voyage: "Voyage Charter",
  time_charter: "Time Charter",
  bareboat: "Bareboat",
  coa: "COA",
  other: "Other",
};

const CHARTER_LABELS: Record<string, string> = {
  brokered: "Brokered",
  owner_to_charterer: "Owner ↔ Charterer",
  internal_reference: "Internal Reference",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatUser(id: string | null): string {
  if (!id) return "System";
  return id.replace(/^@/, "").split(":")[0] || id;
}

export function FixtureOverviewTab({ fixtureId }: { fixtureId: string }) {
  const [data, setData] = useState<OverviewData>({
    fixture: null,
    terms: [],
    candidates: [],
    insights: [],
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [fxRes, termsRes, insightsRes] = await Promise.all([
        quintApi.get<{ fixture: Fixture }>(`/v1/fixtures/${fixtureId}`),
        quintApi.get<{ terms: Term[]; candidates: Candidate[] }>(
          `/v1/fixtures/${fixtureId}/terms`,
        ),
        quintApi.get<{ insights: Insight[] }>(
          `/v1/fixtures/${fixtureId}/insights`,
        ),
      ]);
      setData({
        fixture: fxRes.fixture,
        terms: termsRes.terms ?? [],
        candidates: termsRes.candidates ?? [],
        insights: insightsRes.insights ?? [],
      });
    } catch {
      // partial data is fine
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading overview…
      </div>
    );
  }

  const fx = data.fixture;
  if (!fx) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
        Could not load fixture details.
      </div>
    );
  }

  const stage = STAGE_STYLES[fx.stage] ?? STAGE_STYLES.negotiating;
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of data.insights) {
    if (i.severity in sevCounts) sevCounts[i.severity as keyof typeof sevCounts]++;
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{fx.title}</h2>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  stage.bg,
                  stage.color,
                )}
              >
                {stage.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {fx.fixture_number} &middot;{" "}
              {fx.source_type === "ai_extracted" ? "AI Detected" : "Manual"}{" "}
              &middot; Created {formatDate(fx.created_at)}
            </p>
          </div>
          {fx.confidence != null && (
            <div className="flex flex-col items-center rounded-lg border border-slate-100 bg-slate-50 px-4 py-2">
              <span className="text-2xl font-bold text-slate-900">
                {Math.round(fx.confidence * 100)}%
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                AI Confidence
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoCard
          icon={Ship}
          label="Vessel"
          value={fx.vessel_name || "TBN"}
          muted={!fx.vessel_name}
        />
        <InfoCard
          icon={Box}
          label="Cargo"
          value={fx.cargo_description || "Not specified"}
          muted={!fx.cargo_description}
        />
        <InfoCard
          icon={Tag}
          label="Deal Type"
          value={DEAL_LABELS[fx.deal_type] || fx.deal_type}
        />
        <InfoCard
          icon={Anchor}
          label="Charter Type"
          value={CHARTER_LABELS[fx.charter_type] || fx.charter_type}
        />
      </div>

      {/* Route */}
      {(fx.load_port || fx.discharge_port) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Route
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-800">
                {fx.load_port || "TBN"}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-slate-800">
                {fx.discharge_port || "TBN"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={CheckCircle2}
          label="Accepted Terms"
          value={data.terms.length}
          sub={
            data.candidates.length > 0
              ? `${data.candidates.length} pending review`
              : undefined
          }
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          icon={Sparkles}
          label="Copilot Insights"
          value={data.insights.length}
          sub={
            sevCounts.critical + sevCounts.high > 0
              ? `${sevCounts.critical + sevCounts.high} high priority`
              : undefined
          }
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          icon={BarChart3}
          label="Status"
          value={fx.status.charAt(0).toUpperCase() + fx.status.slice(1)}
          sub={`Updated ${formatDate(fx.updated_at)}`}
          color="text-slate-600"
          bg="bg-slate-50"
        />
      </div>

      {/* Key terms snapshot */}
      {data.terms.length > 0 && (
        <KeyTermsPanel terms={data.terms} />
      )}
    </div>
  );
}

function KeyTermsPanel({ terms }: { terms: Array<{ id: string; term_label: string; term_value: string | null; unit?: string | null; is_locked?: boolean }> }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? terms : terms.slice(0, 9);
  const hasMore = terms.length > 9;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Key Terms
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-3">
        {visible.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{t.term_label}</p>
              <p className="truncate text-sm font-medium text-slate-900">
                {t.term_value}
                {t.unit && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    {t.unit}
                  </span>
                )}
              </p>
            </div>
            {t.is_locked && (
              <span className="mt-1 shrink-0 text-[10px] text-amber-500">
                Locked
              </span>
            )}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {expanded
            ? "Show fewer"
            : `+ ${terms.length - 9} more terms`}
        </button>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: typeof Ship;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p
        className={cn(
          "text-sm font-medium",
          muted ? "text-slate-400 italic" : "text-slate-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            bg,
          )}
        >
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
