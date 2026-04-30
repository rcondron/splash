"use client";

import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import {
  ArrowLeft,
  Ship,
  FileText,
  Clock,
  Shield,
  ShieldOff,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  LogOut,
  Users,
  Paperclip,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { quintApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DealCopilotRail } from "@/components/fixtures/deal-copilot-rail";
import { FixtureIssuesTabReal } from "@/components/fixtures/fixture-issues-tab-real";
import { FixtureMembersTab } from "@/components/fixtures/fixture-members-tab";
import { FixtureOverviewTab } from "@/components/fixtures/fixture-overview-tab";
import { FixtureTermsTab } from "@/components/fixtures/fixture-terms-tab";
import { FixtureTimelineTab } from "@/components/fixtures/fixture-timeline-tab";
import { FixtureAuditTab } from "@/components/fixtures/fixture-audit-tab";
import { FixtureDocumentTab } from "@/components/fixtures/fixture-document-tab";
import { FixtureFilesTab } from "@/components/fixtures/fixture-files-tab";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "terms", label: "Terms", icon: CheckCircle2 },
  { key: "recap", label: "Recap", icon: FileText },
  { key: "charter-party", label: "Charter Party", icon: Shield },
  { key: "reports", label: "Reports", icon: ClipboardList },
  { key: "files", label: "Files", icon: Paperclip },
  { key: "issues", label: "Issues", icon: AlertTriangle },
  { key: "members", label: "Members", icon: Users },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "audit", label: "Audit", icon: Shield },
] as const;

const COPILOT_TABS = new Set(["overview", "terms", "recap", "charter-party", "reports"]);

export default function FixtureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const fixtureId = String(params.id);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [chatRoomError, setChatRoomError] = useState<string | null>(null);
  const [fixtureLoading, setFixtureLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChatRoomId(null);
    setChatRoomError(null);
    setAccessDenied(false);
    setFixtureLoading(true);
    void (async () => {
      try {
        const res = await quintApi.get<{ fixture: { room_id: string } }>(
          `/v1/fixtures/${fixtureId}`,
        );
        if (!cancelled) {
          setChatRoomId(res.fixture.room_id);
          setFixtureLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "";
          const isAccessError =
            msg.includes("No access") ||
            msg.includes("Forbidden") ||
            msg.includes("403");
          if (isAccessError) {
            setAccessDenied(true);
          } else {
            setChatRoomError(msg || "Could not load fixture");
          }
          setFixtureLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeaveFixture = async () => {
    setLeaving(true);
    try {
      await quintApi.delete<{ left?: boolean }>(`/v1/fixtures/${fixtureId}`);
      toast.success("You left this fixture — it stays for other members.");
      router.push("/fixtures");
    } catch (e) {
      setLeaving(false);
      setConfirmLeave(false);
      toast.error(e instanceof Error ? e.message : "Could not leave fixture");
    }
  };

  const showCopilot = COPILOT_TABS.has(activeTab);

  if (fixtureLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="text-sm text-slate-500">Loading fixture…</span>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <ShieldOff className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Access Denied
            </h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              You are not a member of this fixture. Ask a current member to add
              you, or go back to your fixtures list.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/fixtures")}
            className="mt-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fixtures
          </Button>
        </div>
      </div>
    );
  }

  if (chatRoomError && !chatRoomId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Could not load fixture
            </h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {chatRoomError}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/fixtures")}
            className="mt-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fixtures
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar: back, title, actions */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 pb-4 pt-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/fixtures")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              Fixture {fixtureId.slice(0, 8)}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Draft &middot; Lead
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            title="Remove yourself from this fixture"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave fixture
          </button>
          {showCopilot && (
            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
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
      </div>

      {/* Sidebar + main + copilot */}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
          <nav
            className="flex flex-col gap-0.5 overflow-y-auto p-3"
            aria-label="Fixture sections"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Fragment key={tab.key}>
                  {tab.key === "members" && (
                    <div
                      className="my-2 h-px bg-slate-200"
                      role="separator"
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-blue-600" : "text-slate-400",
                      )}
                    />
                    <span className="truncate">{tab.label}</span>
                  </button>
                </Fragment>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 min-h-0 flex-1 gap-6 overflow-hidden bg-slate-50/50 p-4 pl-5">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {activeTab === "overview" ? (
              <FixtureOverviewTab fixtureId={fixtureId} />
            ) : activeTab === "terms" ? (
              <FixtureTermsTab fixtureId={fixtureId} />
            ) : activeTab === "timeline" ? (
              <FixtureTimelineTab fixtureId={fixtureId} />
            ) : activeTab === "recap" ? (
              <FixtureDocumentTab
                fixtureId={fixtureId}
                docType="recap"
                label="Recap"
              />
            ) : activeTab === "charter-party" ? (
              <FixtureDocumentTab
                fixtureId={fixtureId}
                docType="charter_party"
                label="Charter Party"
              />
            ) : activeTab === "reports" ? (
              <FixtureDocumentTab
                fixtureId={fixtureId}
                docType="report"
                label="Status Report"
              />
            ) : activeTab === "files" ? (
              <FixtureFilesTab fixtureId={fixtureId} />
            ) : activeTab === "issues" ? (
              <FixtureIssuesTabReal fixtureId={fixtureId} />
            ) : activeTab === "members" ? (
              <FixtureMembersTab fixtureId={fixtureId} />
            ) : activeTab === "audit" ? (
              <FixtureAuditTab fixtureId={fixtureId} />
            ) : (
              <TabPlaceholder tab={activeTab} />
            )}
          </div>

          {showCopilot && copilotOpen && (
            <DealCopilotRail
              fixtureId={fixtureId}
              activeTab={activeTab}
              onClose={() => setCopilotOpen(false)}
              chatRoomId={chatRoomId}
              chatRoomError={chatRoomError}
            />
          )}
        </div>
      </div>

      {/* Leave fixture — removes only your membership */}
      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
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
              onClick={() => setConfirmLeave(false)}
              disabled={leaving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleLeaveFixture()}
              disabled={leaving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {leaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Leave fixture
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
