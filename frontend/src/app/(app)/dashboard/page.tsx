"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ship,
  FileText,
  MessageSquare,
  ScrollText,
  Plus,
  Mail,
  Clock,
  ArrowRight,
  Loader2,
  TrendingUp,
  Anchor,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { Voyage, VoyageStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardStats {
  activeVoyages: number;
  pendingTerms: number;
  recentMessages: number;
  recapsGenerated: number;
}

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user?: { firstName: string; lastName: string };
  voyage?: { reference: string };
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  inquiry: {
    label: "Inquiry",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  negotiation: {
    label: "Negotiating",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  subjects: {
    label: "On Subjects",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  fixed: {
    label: "Fixed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

function getStatusBadge(status: string) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    activeVoyages: 0,
    pendingTerms: 0,
    recentMessages: 0,
    recapsGenerated: 0,
  });
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        const [voyagesRes, statsRes, activityRes] = await Promise.allSettled([
          api.get<{ data: Voyage[] }>("/voyages?limit=5&sortBy=updatedAt&sortOrder=desc"),
          api.get<DashboardStats>("/dashboard/stats"),
          api.get<{ data: ActivityItem[] }>("/audit?limit=8"),
        ]);

        if (voyagesRes.status === "fulfilled") {
          const data = voyagesRes.value;
          const list = Array.isArray(data) ? data : data?.data ?? [];
          setVoyages(list);
        }

        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value);
        } else {
          // Derive stats from voyages if stats endpoint unavailable
          if (voyagesRes.status === "fulfilled") {
            const list = Array.isArray(voyagesRes.value)
              ? voyagesRes.value
              : voyagesRes.value?.data ?? [];
            const activeStatuses = [
              VoyageStatus.INQUIRY,
              VoyageStatus.NEGOTIATION,
              VoyageStatus.SUBJECTS,
              VoyageStatus.FIXED,
            ];
            setStats((prev) => ({
              ...prev,
              activeVoyages: list.filter((v: Voyage) =>
                activeStatuses.includes(v.status)
              ).length,
            }));
          }
        }

        if (activityRes.status === "fulfilled") {
          const data = activityRes.value;
          setActivity(Array.isArray(data) ? data : data?.data ?? []);
        }
      } catch {
        // Silently handle - dashboard degrades gracefully
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const statCards = [
    {
      title: "Active Voyages",
      value: stats.activeVoyages,
      icon: Ship,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Pending Terms",
      value: stats.pendingTerms,
      icon: FileText,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Recent Messages",
      value: stats.recentMessages,
      icon: MessageSquare,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Recaps Generated",
      value: stats.recapsGenerated,
      icon: ScrollText,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.firstName ?? "Captain"}
          </h1>
          <p className="text-sm text-slate-500">
            Here is what is happening across your voyages today.
          </p>
        </div>
        <div className="flex gap-2 mt-3 sm:mt-0">
          <Button
            onClick={() => router.push("/voyages/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Voyage
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/voyages?action=import")}
          >
            <Mail className="mr-2 h-4 w-4" />
            Import Email
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      card.bgColor
                    )}
                  >
                    <Icon className={cn("h-6 w-6", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Voyages */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Recent Voyages
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/voyages")}
              className="text-blue-600 hover:text-blue-700"
            >
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {voyages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                  <Anchor className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">
                  No voyages yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first voyage to get started.
                </p>
                <Button
                  size="sm"
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push("/voyages/new")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Voyage
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <div className="col-span-3">Reference</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-3">Route</div>
                  <div className="col-span-2">Cargo</div>
                  <div className="col-span-2 text-right">Updated</div>
                </div>
                {voyages.map((voyage) => (
                  <button
                    key={voyage.id}
                    onClick={() => router.push(`/voyages/${voyage.id}`)}
                    className="grid w-full grid-cols-12 gap-4 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-slate-50"
                  >
                    <div className="col-span-3 font-medium text-slate-900 truncate">
                      {voyage.reference}
                    </div>
                    <div className="col-span-2">
                      {getStatusBadge(voyage.status)}
                    </div>
                    <div className="col-span-3 text-slate-600 truncate">
                      {voyage.loadPort && voyage.dischargePort
                        ? `${voyage.loadPort} - ${voyage.dischargePort}`
                        : voyage.loadPort || voyage.dischargePort || "--"}
                    </div>
                    <div className="col-span-2 text-slate-600 truncate">
                      {voyage.cargoType ?? "--"}
                    </div>
                    <div className="col-span-2 text-right text-slate-400">
                      {timeAgo(voyage.updatedAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                  <Clock className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">
                  No activity yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Activity will appear here as you use the platform.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">
                        <span className="font-medium">
                          {item.user
                            ? `${item.user.firstName} ${item.user.lastName}`
                            : "System"}
                        </span>{" "}
                        {formatAction(item.action, item.entityType)}
                        {item.voyage && (
                          <span className="font-medium">
                            {" "}
                            {item.voyage.reference}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatAction(action: string, entityType: string): string {
  const actionMap: Record<string, string> = {
    create: "created",
    update: "updated",
    delete: "deleted",
    status_change: "changed status of",
    message_sent: "sent a message in",
    term_extracted: "extracted terms from",
    recap_generated: "generated a recap for",
  };

  const entityMap: Record<string, string> = {
    voyage: "voyage",
    message: "message",
    conversation: "conversation",
    term: "term",
    recap: "recap",
    contract: "contract",
  };

  const actionText = actionMap[action] ?? action.replace(/_/g, " ");
  const entityText = entityMap[entityType] ?? entityType;

  return `${actionText} a ${entityText}`;
}
