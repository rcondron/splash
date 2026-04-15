"use client";

import { useEffect, useState } from "react";
import {
  Ship,
  Languages,
  BookOpen,
  Cpu,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  Anchor,
  Sparkles,
  Activity,
  HardDrive,
  MemoryStick,
  FileText,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { quintApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HealthStatus {
  status: string;
  database?: { connected: boolean; status: string };
  timestamp?: string;
}

interface AiStatus {
  status?: string;
  phase?: string;
  implementation?: string;
  ticket?: string;
  capabilities?: string[];
  endpoints?: Record<string, string>;
}

interface SystemStats {
  system?: {
    cpu_percent?: number;
    memory_percent?: number;
  };
  connection_pool?: Record<string, unknown>;
}

interface Metrics {
  metrics?: {
    uptime_hours?: number;
    requests_total?: number;
    cpu_usage?: { usage_percent?: number; count?: number };
    memory_usage?: { used_gb?: number; total_gb?: number; usage_percent?: number };
    disk_usage?: { used_gb?: number; total_gb?: number; usage_percent?: number };
  };
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [translateInput, setTranslateInput] = useState("");
  const [translateResult, setTranslateResult] = useState<Record<string, unknown> | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);

  const [vesselImo, setVesselImo] = useState("");
  const [vesselResult, setVesselResult] = useState<Record<string, unknown> | null>(null);
  const [vesselLoading, setVesselLoading] = useState(false);

  const [glossary, setGlossary] = useState<Array<{ term: string; definition?: string; term_display?: string; category?: string;[k: string]: unknown }> | null>(null);
  const [glossaryLoading, setGlossaryLoading] = useState(false);

  const [entityInput, setEntityInput] = useState("");
  const [entityResult, setEntityResult] = useState<Record<string, unknown> | null>(null);
  const [entityLoading, setEntityLoading] = useState(false);

  const [voyageInput, setVoyageInput] = useState("");
  const [voyageResult, setVoyageResult] = useState<Record<string, unknown> | null>(null);
  const [voyageLoading, setVoyageLoading] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      setStatusLoading(true);
      const [h, ai, s, m] = await Promise.allSettled([
        quintApi.get<HealthStatus>("/v1/health"),
        quintApi.get<AiStatus>("/v1/ai/v181/status"),
        quintApi.get<SystemStats>("/v1/stats"),
        quintApi.get<Metrics>("/v1/metrics"),
      ]);
      if (h.status === "fulfilled") setHealth(h.value);
      if (ai.status === "fulfilled") setAiStatus(ai.value);
      if (s.status === "fulfilled") setStats(s.value);
      if (m.status === "fulfilled") setMetrics(m.value);
      setStatusLoading(false);
    }
    fetchStatus();
  }, []);

  const handleTranslate = async () => {
    if (!translateInput.trim()) return;
    setTranslateLoading(true);
    setTranslateResult(null);
    try {
      const res = await quintApi.post<Record<string, unknown>>("/v1/ai/v181/translate", { text: translateInput });
      setTranslateResult(res);
    } catch (err) {
      setTranslateResult({ error: err instanceof Error ? err.message : "Failed" });
    } finally {
      setTranslateLoading(false);
    }
  };

  const handleVesselLookup = async () => {
    if (!vesselImo.trim()) return;
    setVesselLoading(true);
    setVesselResult(null);
    try {
      const res = await quintApi.get<Record<string, unknown>>(`/v1/ai/v181/vessel/lookup?imo=${vesselImo.trim()}`);
      setVesselResult(res);
    } catch (err) {
      setVesselResult({ error: err instanceof Error ? err.message : "Failed" });
    } finally {
      setVesselLoading(false);
    }
  };

  const handleGlossary = async () => {
    setGlossaryLoading(true);
    setGlossary(null);
    try {
      const res = await quintApi.get<{ items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>("/v1/ai/v181/glossary");
      const items = Array.isArray(res) ? res : (res as { items: Array<Record<string, unknown>> }).items ?? [];
      setGlossary(items as typeof glossary);
    } catch (err) {
      setGlossary([{ term: "Error", definition: err instanceof Error ? err.message : "Failed" }]);
    } finally {
      setGlossaryLoading(false);
    }
  };

  const handleEntityExtract = async () => {
    if (!entityInput.trim()) return;
    setEntityLoading(true);
    setEntityResult(null);
    try {
      const res = await quintApi.post<Record<string, unknown>>("/v1/ai/v181/entities/extract", { text: entityInput });
      setEntityResult(res);
    } catch (err) {
      setEntityResult({ error: err instanceof Error ? err.message : "Failed" });
    } finally {
      setEntityLoading(false);
    }
  };

  const handleVoyageExtract = async () => {
    if (!voyageInput.trim()) return;
    setVoyageLoading(true);
    setVoyageResult(null);
    try {
      const res = await quintApi.post<Record<string, unknown>>("/v1/ai/v181/voyage/extract", { messages: [voyageInput] });
      setVoyageResult(res);
    } catch (err) {
      setVoyageResult({ error: err instanceof Error ? err.message : "Failed" });
    } finally {
      setVoyageLoading(false);
    }
  };

  const healthy = health?.status === "healthy";
  const dbOk = health?.database?.connected === true;
  const m = metrics?.metrics;
  const cpuPct = m?.cpu_usage?.usage_percent ?? stats?.system?.cpu_percent;
  const memPct = m?.memory_usage?.usage_percent ?? stats?.system?.memory_percent;
  const diskPct = m?.disk_usage?.usage_percent;
  const uptime = m?.uptime_hours;
  const totalReqs = m?.requests_total;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.firstName ?? "Captain"}
        </h1>
        <p className="text-sm text-slate-500">
          Quint AI maritime tools — connected to the remote API.
        </p>
      </div>

      {/* Status + System Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatusCard
          title="API Health"
          loading={statusLoading}
          ok={healthy}
          okLabel="Healthy"
          failLabel="Unavailable"
          icon={<Cpu className="h-6 w-6 text-emerald-600" />}
          bgColor="bg-emerald-50"
        />
        <StatusCard
          title="Database"
          loading={statusLoading}
          ok={dbOk}
          okLabel="Connected"
          failLabel="Unknown"
          icon={<Anchor className="h-6 w-6 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatusCard
          title="AI Engine"
          loading={statusLoading}
          ok={!!aiStatus}
          okLabel={`Phase ${aiStatus?.phase ?? "?"}`}
          failLabel="Unavailable"
          icon={<Sparkles className="h-6 w-6 text-violet-600" />}
          bgColor="bg-violet-50"
        />
        <MetricCard title="CPU" value={cpuPct != null ? `${cpuPct.toFixed(1)}%` : "—"} loading={statusLoading} icon={<Activity className="h-5 w-5 text-amber-600" />} />
        <MetricCard title="Memory" value={memPct != null ? `${memPct.toFixed(1)}%` : "—"} loading={statusLoading} icon={<MemoryStick className="h-5 w-5 text-rose-600" />} />
        <MetricCard title="Disk" value={diskPct != null ? `${diskPct.toFixed(1)}%` : "—"} loading={statusLoading} icon={<HardDrive className="h-5 w-5 text-cyan-600" />} />
      </div>

      {uptime != null && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span>Uptime: <strong className="text-slate-700">{uptime.toFixed(1)}h</strong></span>
          {totalReqs != null && <span>Requests served: <strong className="text-slate-700">{totalReqs.toLocaleString()}</strong></span>}
        </div>
      )}

      {/* AI capabilities */}
      {aiStatus?.capabilities && (
        <div className="flex flex-wrap gap-2">
          {aiStatus.capabilities.map((cap) => (
            <span key={cap} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {cap.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Tool Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ToolCard title="Maritime Translation" icon={<Languages className="h-5 w-5 text-blue-600" />}>
          <ToolInput placeholder="Enter maritime text to translate…" value={translateInput} onChange={setTranslateInput} onSubmit={handleTranslate} loading={translateLoading} />
          <ResultPre data={translateResult} />
        </ToolCard>

        <ToolCard title="Vessel Lookup" icon={<Ship className="h-5 w-5 text-blue-600" />}>
          <ToolInput placeholder="Enter 7-digit IMO number…" value={vesselImo} onChange={setVesselImo} onSubmit={handleVesselLookup} loading={vesselLoading} buttonIcon={<Search className="h-4 w-4" />} />
          <ResultPre data={vesselResult} />
        </ToolCard>

        <ToolCard title="Entity Extraction" icon={<Sparkles className="h-5 w-5 text-violet-600" />} buttonColor="bg-violet-600 hover:bg-violet-700">
          <ToolInput placeholder="Paste maritime text to extract entities…" value={entityInput} onChange={setEntityInput} onSubmit={handleEntityExtract} loading={entityLoading} color="violet" />
          <ResultPre data={entityResult} />
        </ToolCard>

        <ToolCard title="Voyage Extraction" icon={<FileText className="h-5 w-5 text-emerald-600" />}>
          <ToolInput placeholder="Paste fixture / recap text to extract voyage data…" value={voyageInput} onChange={setVoyageInput} onSubmit={handleVoyageExtract} loading={voyageLoading} color="emerald" />
          <ResultPre data={voyageResult} />
        </ToolCard>

        {/* Glossary */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BookOpen className="h-5 w-5 text-amber-600" />
              Maritime Glossary
            </CardTitle>
            <Button onClick={handleGlossary} disabled={glossaryLoading} variant="outline" size="sm">
              {glossaryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
              Load Glossary
            </Button>
          </CardHeader>
          <CardContent>
            {glossary ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-72 overflow-auto">
                {glossary.map((item, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{item.term_display ?? item.term}</p>
                    {item.category && <span className="text-[10px] uppercase tracking-wider text-blue-500">{item.category}</span>}
                    {item.definition && <p className="text-sm text-slate-600 mt-0.5">{item.definition}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-8 text-center">
                Click &ldquo;Load Glossary&rdquo; to fetch maritime terminology from the Quint API.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── small presentational helpers ── */

function StatusCard({ title, loading, ok, okLabel, failLabel, icon, bgColor }: {
  title: string; loading: boolean; ok: boolean; okLabel: string; failLabel: string; icon: React.ReactNode; bgColor: string;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{title}</p>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : ok ? (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold">{okLabel}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">{failLabel}</span>
              </div>
            )}
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bgColor)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, loading, icon }: {
  title: string; value: string; loading: boolean; icon: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-xs font-medium text-slate-500">{title}</p>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-0.5" />
            ) : (
              <p className="text-lg font-bold text-slate-900">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; buttonColor?: string; children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ToolInput({ placeholder, value, onChange, onSubmit, loading, buttonIcon, color = "blue" }: {
  placeholder: string; value: string; onChange: (v: string) => void; onSubmit: () => void; loading: boolean; buttonIcon?: React.ReactNode; color?: string;
}) {
  const btnClass = color === "violet"
    ? "bg-violet-600 hover:bg-violet-700 text-white"
    : color === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";
  return (
    <div className="flex gap-2">
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit()} className="flex-1" />
      <Button onClick={onSubmit} disabled={loading || !value.trim()} className={btnClass}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : buttonIcon ?? <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function ResultPre({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <pre className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 overflow-auto max-h-48 whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
