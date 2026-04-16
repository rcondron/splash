"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Gavel,
  MessageSquare,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── types ── */

interface Issue {
  id: string;
  issue_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  current_position_summary?: string;
  recommended_resolution?: string;
  related_term_key?: string;
  status: string;
  owner?: string;
  opened_at: string;
  updated_at: string;
  requires_legal_review: boolean;
  comments: IssueComment[];
}

interface IssueComment {
  id: string;
  author: string;
  author_type: "user" | "system" | "ai";
  body: string;
  created_at: string;
}

/* ── mock data ── */

const MOCK_ISSUES: Issue[] = [
  {
    id: "iss-1",
    issue_type: "recap_mismatch",
    severity: "high",
    title: "Recap conflicts with negotiated cargo quantity",
    description:
      "Recent chat references 12,500 MT, but the current recap states 15,000 MT. Human review required before circulation.",
    current_position_summary: "Chat evidence says 12,500 MT. Recap says 15,000 MT.",
    recommended_resolution: "Update recap to 12,500 MT or confirm new quantity with charterer.",
    related_term_key: "cargo_quantity",
    status: "open",
    owner: "John Mitchell",
    opened_at: "2026-04-15T09:30:00Z",
    updated_at: "2026-04-15T10:15:00Z",
    requires_legal_review: false,
    comments: [
      {
        id: "c1",
        author: "System",
        author_type: "system",
        body: "Issue created from Copilot insight — inconsistent cargo quantity detected.",
        created_at: "2026-04-15T09:30:00Z",
      },
      {
        id: "c2",
        author: "AI",
        author_type: "ai",
        body: "Recommendation: confirm 12,500 MT with charterer before regenerating recap.",
        created_at: "2026-04-15T09:31:00Z",
      },
    ],
  },
  {
    id: "iss-2",
    issue_type: "risky_clause",
    severity: "medium",
    title: "Arbitration clause deviates from standard",
    description:
      "CP draft references New York arbitration, but company standard and confirmed terms specify London.",
    status: "under_review",
    owner: "Legal Team",
    opened_at: "2026-04-14T14:00:00Z",
    updated_at: "2026-04-15T08:00:00Z",
    requires_legal_review: true,
    related_term_key: "arbitration_place",
    comments: [],
  },
];

/* ── styles ── */

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  triaged: "bg-purple-100 text-purple-700",
  clarification_needed: "bg-amber-100 text-amber-700",
  under_review: "bg-indigo-100 text-indigo-700",
  pending_counterparty: "bg-cyan-100 text-cyan-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-slate-100 text-slate-500",
  escalated_legal: "bg-red-100 text-red-700",
  exported: "bg-slate-200 text-slate-600",
};

function statusLabel(s: string): string {
  return s
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function typeLabel(t: string): string {
  return t
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/* ── component ── */

interface FixtureIssuesTabProps {
  fixtureId: string;
}

export function FixtureIssuesTab({ fixtureId }: FixtureIssuesTabProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const issues = MOCK_ISSUES;
  const openCount = issues.filter((i) => !["resolved", "dismissed"].includes(i.status)).length;
  const highCount = issues.filter((i) => i.severity === "high" || i.severity === "critical").length;
  const legalCount = issues.filter((i) => i.requires_legal_review).length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

  const filtered =
    filterStatus === "all"
      ? issues
      : filterStatus === "unresolved"
        ? issues.filter((i) => !["resolved", "dismissed"].includes(i.status))
        : issues.filter((i) => i.status === filterStatus);

  return (
    <div className="flex gap-6">
      {/* Main list */}
      <div className={cn("flex-1 space-y-4", selectedIssue && "max-w-[55%]")}>
        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-3">
          <SummaryCard label="Open" value={openCount} color="text-blue-600" />
          <SummaryCard
            label="High / Critical"
            value={highCount}
            color="text-orange-600"
          />
          <SummaryCard
            label="Legal Review"
            value={legalCount}
            color="text-red-600"
          />
          <SummaryCard
            label="Resolved"
            value={resolvedCount}
            color="text-emerald-600"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search issues..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-300"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="unresolved">Unresolved only</option>
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="pending_counterparty">Pending counterparty</option>
            <option value="escalated_legal">Escalated (Legal)</option>
            <option value="resolved">Resolved</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Create Issue
          </button>
        </div>

        {/* Issue table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-sm font-medium text-slate-600">No issues</p>
              <p className="mt-1 text-xs text-slate-400">
                {filterStatus === "all"
                  ? "No issues have been created for this fixture yet."
                  : "No issues match this filter."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className={cn(
                    "flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-slate-50",
                    selectedIssue?.id === issue.id && "bg-blue-50",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      SEVERITY_BADGE[issue.severity],
                    )}
                  >
                    {issue.severity.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {issue.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 truncate">
                      {typeLabel(issue.issue_type)}
                      {issue.related_term_key &&
                        ` · ${issue.related_term_key}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      STATUS_BADGE[issue.status] ?? "bg-slate-100 text-slate-500",
                    )}
                  >
                    {statusLabel(issue.status)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selectedIssue && (
        <IssueDetailDrawer
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}

/* ── sub-components ── */

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={cn("mt-1 text-xl font-bold", color)}>{value}</p>
    </div>
  );
}

function IssueDetailDrawer({
  issue,
  onClose,
}: {
  issue: Issue;
  onClose: () => void;
}) {
  return (
    <div className="w-[380px] shrink-0 overflow-y-auto rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                SEVERITY_BADGE[issue.severity],
              )}
            >
              {issue.severity.toUpperCase()}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                STATUS_BADGE[issue.status] ?? "bg-slate-100 text-slate-500",
              )}
            >
              {statusLabel(issue.status)}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-bold text-slate-900 leading-tight">
            {issue.title}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {typeLabel(issue.issue_type)}
            {issue.owner && ` · ${issue.owner}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 rounded-md p-1 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        {/* Description */}
        <Section title="Description">
          <p className="text-sm text-slate-700 leading-relaxed">
            {issue.description}
          </p>
        </Section>

        {/* Conflict snapshot */}
        {issue.current_position_summary && (
          <Section title="Conflict Snapshot">
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 leading-relaxed">
              {issue.current_position_summary}
            </div>
          </Section>
        )}

        {/* Recommended resolution */}
        {issue.recommended_resolution && (
          <Section title="Recommended Resolution">
            <p className="text-sm text-slate-700 leading-relaxed">
              {issue.recommended_resolution}
            </p>
          </Section>
        )}

        {/* Actions */}
        <Section title="Actions">
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={MessageSquare} label="Draft message" primary />
            <ActionBtn icon={ExternalLink} label="View source chat" />
            <ActionBtn icon={User} label="Assign" />
            <ActionBtn icon={CheckCircle2} label="Resolve" />
            <ActionBtn icon={X} label="Dismiss" />
            {issue.requires_legal_review && (
              <ActionBtn icon={Gavel} label="Escalate to Legal" danger />
            )}
          </div>
        </Section>

        {/* Comments */}
        <Section title="Activity">
          {issue.comments.length === 0 ? (
            <p className="text-xs text-slate-400">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {issue.comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                      c.author_type === "ai"
                        ? "bg-purple-500"
                        : c.author_type === "system"
                          ? "bg-slate-400"
                          : "bg-blue-600",
                    )}
                  >
                    {c.author_type === "ai"
                      ? "AI"
                      : c.author_type === "system"
                        ? "S"
                        : c.author[0]}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-700">
                        {c.author}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h4>
      {children}
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  primary,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : danger
            ? "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
