"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Ship,
  FileText,
  Clock,
  Shield,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DealCopilotRail } from "@/components/fixtures/deal-copilot-rail";
import { FixtureIssuesTab } from "@/components/fixtures/fixture-issues-tab";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "terms", label: "Terms", icon: CheckCircle2 },
  { key: "recap", label: "Recap", icon: FileText },
  { key: "charter-party", label: "Charter Party", icon: Shield },
  { key: "issues", label: "Issues", icon: AlertTriangle },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "audit", label: "Audit", icon: Shield },
] as const;

const COPILOT_TABS = new Set(["overview", "terms", "recap", "charter-party"]);

export default function FixtureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const fixtureId = String(params.id);

  const showCopilot = COPILOT_TABS.has(activeTab);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 space-y-4 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/fixtures")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              Fixture {fixtureId.slice(0, 8)}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Draft &middot; Lead
            </p>
          </div>
          {showCopilot && (
            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {copilotOpen ? (
                <PanelRightClose className="h-3.5 w-3.5" />
              ) : (
                <PanelRightOpen className="h-3.5 w-3.5" />
              )}
              Copilot
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-medium transition-colors",
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Body: tab content + optional copilot rail */}
      <div className="flex min-h-0 flex-1 gap-6">
        {/* Tab content */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          {activeTab === "issues" ? (
            <FixtureIssuesTab fixtureId={fixtureId} />
          ) : (
            <TabPlaceholder tab={activeTab} />
          )}
        </div>

        {/* Deal Copilot rail */}
        {showCopilot && copilotOpen && (
          <DealCopilotRail
            fixtureId={fixtureId}
            activeTab={activeTab}
            onClose={() => setCopilotOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function TabPlaceholder({ tab }: { tab: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Ship className="mb-4 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">
          {tab.charAt(0).toUpperCase() + tab.slice(1).replace("-", " ")} view
        </p>
        <p className="mt-1 text-xs text-slate-400">
          This section will display fixture{" "}
          {tab.replace("-", " ")} data
        </p>
      </div>
    </div>
  );
}
