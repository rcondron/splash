"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  PanelRightClose,
  Search,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DealCopilotRailProps {
  fixtureId: string;
  activeTab: string;
  onClose: () => void;
}

/* ── mock data (until backend wired) ── */

interface InsightCard {
  id: string;
  insight_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  why_it_matters?: string;
  recommended_action?: string;
  suggested_chat_message?: string;
  related_term_key?: string;
  confidence?: number;
  status: "open" | "acknowledged" | "dismissed" | "resolved" | "escalated";
}

const MOCK_GAPS: InsightCard[] = [
  {
    id: "g1",
    insight_type: "missing_term",
    severity: "high",
    title: "Laycan not confirmed",
    description: "No explicit final laycan range found in the recent negotiation thread.",
    why_it_matters: "Without a confirmed laycan, the recap cannot be circulated and cancellation rights are undefined.",
    recommended_action: "Ask counterparty to confirm firm laycan dates.",
    suggested_chat_message: "Could you please confirm the firm laycan dates for this fixture?",
    related_term_key: "laycan_start",
    confidence: 0.92,
    status: "open",
  },
  {
    id: "g2",
    insight_type: "missing_term",
    severity: "medium",
    title: "Demurrage rate not agreed",
    description: "No demurrage/dispatch terms found in conversation or fixture terms.",
    why_it_matters: "Missing demurrage terms are a common source of post-fixture disputes.",
    recommended_action: "Raise demurrage and dispatch terms in the next round.",
    related_term_key: "demurrage_rate",
    confidence: 0.85,
    status: "open",
  },
];

const MOCK_AMBIGUITIES: InsightCard[] = [
  {
    id: "a1",
    insight_type: "ambiguous_term",
    severity: "medium",
    title: "Cargo quantity unclear",
    description: "Quantity mentioned as both 10,000 and 12,500 MT in different messages.",
    why_it_matters: "Ambiguous quantity could lead to freight and demurrage disagreements.",
    recommended_action: "Confirm final cargo quantity with charterer.",
    suggested_chat_message: "Just to confirm — are we working on 10,000 MT or 12,500 MT for this cargo?",
    related_term_key: "cargo_quantity",
    confidence: 0.78,
    status: "open",
  },
];

const MOCK_INCONSISTENCIES: InsightCard[] = [
  {
    id: "i1",
    insight_type: "inconsistent_term",
    severity: "high",
    title: "Arbitration clause conflict",
    description: "Confirmed terms show London arbitration, but CP draft references New York.",
    why_it_matters: "Mismatched arbitration clauses may cause legal complications if dispute arises.",
    recommended_action: "Align CP arbitration clause with confirmed terms.",
    related_term_key: "arbitration_place",
    confidence: 0.95,
    status: "open",
  },
];

const MOCK_ACTIONS: InsightCard[] = [
  {
    id: "na1",
    insight_type: "followup_suggestion",
    severity: "low",
    title: "Run recap regeneration",
    description: "3 terms were updated since the last recap was generated.",
    recommended_action: "Regenerate recap to reflect latest agreed terms.",
    confidence: 0.99,
    status: "open",
  },
];

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  low: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
};

const SECTION_META = [
  {
    key: "gaps",
    label: "Gaps to Close",
    icon: Target,
    items: MOCK_GAPS,
    color: "text-orange-600",
  },
  {
    key: "ambiguities",
    label: "Ambiguities",
    icon: HelpCircle,
    items: MOCK_AMBIGUITIES,
    color: "text-amber-600",
  },
  {
    key: "inconsistencies",
    label: "Inconsistencies",
    icon: AlertTriangle,
    items: MOCK_INCONSISTENCIES,
    color: "text-red-600",
  },
  {
    key: "actions",
    label: "Suggested Next Actions",
    icon: Lightbulb,
    items: MOCK_ACTIONS,
    color: "text-blue-600",
  },
] as const;

export function DealCopilotRail({
  fixtureId,
  activeTab,
  onClose,
}: DealCopilotRailProps) {
  const totalOpen =
    MOCK_GAPS.length +
    MOCK_AMBIGUITIES.length +
    MOCK_INCONSISTENCIES.length +
    MOCK_ACTIONS.length;

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
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {SECTION_META.map((section) => {
          const Icon = section.icon;
          const count = section.items.filter((i) => i.status === "open").length;
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
                {section.items.length === 0 ? (
                  <p className="py-2 text-center text-xs text-slate-400">
                    None detected
                  </p>
                ) : (
                  section.items.map((card) => (
                    <CopilotCard key={card.id} card={card} />
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
              <span className="text-slate-400">2 min ago</span>
            </div>
            <div className="flex justify-between">
              <span>Unresolved items</span>
              <span className="font-medium">{totalOpen}</span>
            </div>
            <div className="flex justify-between">
              <span>Fixture confidence</span>
              <span className="font-medium text-amber-600">Medium</span>
            </div>
            <div className="flex justify-between">
              <span>Human review</span>
              <span className="font-medium text-orange-600">Recommended</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopilotCard({ card }: { card: InsightCard }) {
  const sev = SEVERITY_STYLES[card.severity] ?? SEVERITY_STYLES.low;

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
            {card.title}
          </p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            {card.description}
          </p>
          {card.why_it_matters && (
            <p className="mt-1.5 text-[11px] italic text-slate-400">
              {card.why_it_matters}
            </p>
          )}
          {card.related_term_key && (
            <span className="mt-1.5 inline-block rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
              {card.related_term_key}
            </span>
          )}

          {/* Actions */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.suggested_chat_message && (
              <button className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700">
                <MessageSquare className="h-3 w-3" />
                Draft message
              </button>
            )}
            <button className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
              <Search className="h-3 w-3" />
              View source
            </button>
            <button className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200 hover:bg-slate-50">
              <X className="h-3 w-3" />
              Dismiss
            </button>
          </div>
        </div>
        {card.confidence != null && (
          <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200">
            {Math.round(card.confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
