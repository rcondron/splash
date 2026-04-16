"use client";

import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Zap,
} from "lucide-react";

const METRIC_CARDS = [
  { label: "Active Fixtures", value: "—", icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
  { label: "Avg Chat → Recap", value: "—", icon: Clock, color: "text-amber-600 bg-amber-50" },
  { label: "Avg Recap → CP", value: "—", icon: Clock, color: "text-purple-600 bg-purple-50" },
  { label: "Open Discrepancies", value: "—", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  { label: "AI Acceptance Rate", value: "—", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  { label: "Review Bottlenecks", value: "—", icon: Users, color: "text-indigo-600 bg-indigo-50" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Fixture pipeline, AI performance, and workflow analytics
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRIC_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">{card.label}</p>
                  <p className="text-xl font-bold text-slate-900">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Fixture Volume by Stage</h3>
          <div className="flex h-48 items-center justify-center">
            <div className="text-center">
              <BarChart3 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-400">Chart data will populate with fixture activity</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">AI Suggestion Throughput</h3>
          <div className="flex h-48 items-center justify-center">
            <div className="text-center">
              <Zap className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-400">AI processing metrics will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
