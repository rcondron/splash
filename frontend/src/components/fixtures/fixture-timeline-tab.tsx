"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Anchor,
  ArrowRightLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Loader2,
  MessageSquareDashed,
  RefreshCw,
  Scale,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { quintApi } from "@/lib/api";

interface Milestone {
  stage: string;
  label: string;
  status: "done" | "active" | "pending";
  timestamp: string | null;
  detail: string | null;
}

interface TimelineResponse {
  milestones: Milestone[];
  fixture: Record<string, unknown>;
}

const STAGE_META: Record<
  string,
  { icon: typeof Anchor; doneColor: string; doneBg: string }
> = {
  created: {
    icon: Anchor,
    doneColor: "text-blue-600",
    doneBg: "bg-blue-600",
  },
  bid: {
    icon: MessageSquareDashed,
    doneColor: "text-violet-600",
    doneBg: "bg-violet-600",
  },
  counter: {
    icon: ArrowRightLeft,
    doneColor: "text-amber-600",
    doneBg: "bg-amber-500",
  },
  terms_accepted: {
    icon: Scale,
    doneColor: "text-emerald-600",
    doneBg: "bg-emerald-600",
  },
  recap: {
    icon: FileText,
    doneColor: "text-indigo-600",
    doneBg: "bg-indigo-600",
  },
  charter_party: {
    icon: Shield,
    doneColor: "text-teal-700",
    doneBg: "bg-teal-700",
  },
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (d.toDateString() === now.toDateString()) return `Today ${time}`;
    if (d.toDateString() === yesterday.toDateString())
      return `Yesterday ${time}`;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function FixtureTimelineTab({ fixtureId }: { fixtureId: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await quintApi.get<TimelineResponse>(
        `/v1/fixtures/${fixtureId}/timeline`,
      );
      setMilestones(res.milestones ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load timeline");
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
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading timeline…
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

  const activeIdx = milestones.findIndex((m) => m.status === "active");
  const lastDoneIdx = milestones.reduce(
    (acc, m, i) => (m.status === "done" ? i : acc),
    -1,
  );
  const progressIdx = activeIdx >= 0 ? activeIdx : lastDoneIdx;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Deal Progress
          </h2>
          <p className="text-xs text-slate-400">
            Fixture lifecycle from creation to charter party
          </p>
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

      {/* Horizontal progress bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="relative flex items-center justify-between">
          {/* Connector line */}
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200" />
          <div
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
            style={{
              width:
                milestones.length > 1
                  ? `${(Math.max(0, progressIdx) / (milestones.length - 1)) * 100}%`
                  : "0%",
            }}
          />

          {milestones.map((m, i) => {
            const meta = STAGE_META[m.stage] ?? STAGE_META.created;
            const Icon = meta.icon;
            const isDone = m.status === "done";
            const isActive = m.status === "active";

            return (
              <div
                key={m.stage}
                className="relative z-10 flex flex-col items-center"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    isDone
                      ? `${meta.doneBg} border-transparent`
                      : isActive
                        ? "border-blue-400 bg-white shadow-md shadow-blue-100"
                        : "border-slate-200 bg-white",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : isActive ? (
                    <Icon className="h-4 w-4 text-blue-600 animate-pulse" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 max-w-[5.5rem] text-center text-[11px] font-medium leading-tight",
                    isDone
                      ? "text-slate-700"
                      : isActive
                        ? "text-blue-600"
                        : "text-slate-400",
                  )}
                >
                  {m.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed milestone cards */}
      <div className="space-y-0">
        {milestones.map((m, i) => {
          const meta = STAGE_META[m.stage] ?? STAGE_META.created;
          const Icon = meta.icon;
          const isDone = m.status === "done";
          const isActive = m.status === "active";
          const isPending = m.status === "pending";
          const isLast = i === milestones.length - 1;

          return (
            <div key={m.stage} className="relative flex gap-4 pl-1">
              {/* Vertical connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isDone
                      ? meta.doneBg
                      : isActive
                        ? "border-2 border-blue-400 bg-white"
                        : "border border-slate-200 bg-slate-50",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : isActive ? (
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-px flex-1 min-h-[2rem]",
                      isDone && milestones[i + 1]?.status !== "pending"
                        ? "bg-gradient-to-b from-slate-300 to-slate-200"
                        : "bg-slate-200",
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "flex-1 pb-5",
                  isPending && "opacity-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isDone
                          ? meta.doneColor
                          : isActive
                            ? "text-blue-500"
                            : "text-slate-400",
                      )}
                    />
                    <h3
                      className={cn(
                        "text-sm font-semibold",
                        isDone
                          ? "text-slate-900"
                          : isActive
                            ? "text-blue-700"
                            : "text-slate-400",
                      )}
                    >
                      {m.label}
                    </h3>
                    {isActive && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        In Progress
                      </span>
                    )}
                  </div>
                  {m.timestamp && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatTimestamp(m.timestamp)}
                    </span>
                  )}
                </div>
                {m.detail && (
                  <p className="mt-0.5 text-xs text-slate-500">{m.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
