"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Search,
  Upload,
  File,
  Loader2,
  Download,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { quintApi } from "@/lib/api";

const DOC_TYPES = [
  "All",
  "Recap",
  "Charter Party",
  "Addendum",
  "Report",
  "Attachment",
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  generated: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  superseded: "bg-slate-200 text-slate-500",
  archived: "bg-slate-200 text-slate-500",
  attached: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  ignored: "bg-slate-200 text-slate-500",
};

const TYPE_ICONS: Record<string, string> = {
  recap: "bg-purple-100 text-purple-600",
  charter_party: "bg-blue-100 text-blue-600",
  addendum: "bg-indigo-100 text-indigo-600",
  report: "bg-emerald-100 text-emerald-600",
  attachment: "bg-amber-100 text-amber-600",
};

function typeLabel(t: string): string {
  return t
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocRow {
  id: string;
  fixture_id: string;
  document_type: string;
  title: string;
  status: string;
  version_number: number;
  model: string | null;
  fixture_title: string | null;
  fixture_number: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function typeFilterKey(label: string): string | null {
  if (label === "All") return null;
  if (label === "Charter Party") return "charter_party";
  return label.toLowerCase();
}

export default function DocumentsPage() {
  const [activeType, setActiveType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocRow | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await quintApi.get<{ documents: DocRow[] }>("/v1/documents");
      setDocuments(res.documents || []);
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const typeFilter = typeFilterKey(activeType);
  const filtered = documents.filter((d) => {
    if (typeFilter && d.document_type !== typeFilter) return false;
    if (
      searchQuery.trim() &&
      !d.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(d.fixture_title ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Recaps, charter parties, addenda, and reports across all your fixtures
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setLoading(true); void load(); }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {DOC_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeType === type
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-6 gap-4 border-b border-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <div className="col-span-2">Title</div>
          <div>Type</div>
          <div>Fixture</div>
          <div>Status</div>
          <div className="text-right">Created</div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              {searchQuery || typeFilter
                ? "No documents match your filter"
                : "No documents yet"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {searchQuery || typeFilter
                ? "Try a different search or filter"
                : "Generate a recap or charter party from a fixture to see it here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={cn(
                  "grid w-full grid-cols-6 gap-4 px-6 py-3.5 text-left text-sm transition-colors hover:bg-slate-50",
                  selectedDoc?.id === doc.id && "bg-blue-50",
                )}
              >
                <div className="col-span-2 flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      TYPE_ICONS[doc.document_type] ?? "bg-slate-100 text-slate-600",
                    )}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      v{doc.version_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      TYPE_ICONS[doc.document_type] ?? "bg-slate-100 text-slate-600",
                    )}
                  >
                    {typeLabel(doc.document_type)}
                  </span>
                </div>
                <div className="flex items-center text-slate-500 text-xs truncate">
                  {doc.fixture_title || doc.fixture_number || "—"}
                </div>
                <div className="flex items-center">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                      STATUS_COLORS[doc.status] ?? "bg-slate-100 text-slate-600",
                    )}
                  >
                    {doc.status}
                  </span>
                </div>
                <div className="flex items-center justify-end text-xs text-slate-400">
                  {doc.created_at
                    ? new Date(doc.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedDoc && (
        <DocDetailDrawer
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}

function DocDetailDrawer({
  doc,
  onClose,
}: {
  doc: DocRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-[400px] flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">Document Details</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div
          className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-xl",
            TYPE_ICONS[doc.document_type] ?? "bg-slate-100 text-slate-600",
          )}
        >
          <FileText className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-900">{doc.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            v{doc.version_number} · {typeLabel(doc.document_type)}
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Status">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                STATUS_COLORS[doc.status] ?? "bg-slate-100 text-slate-600",
              )}
            >
              {doc.status}
            </span>
          </Row>
          {(doc.fixture_title || doc.fixture_number) && (
            <Row label="Fixture">
              <a
                href={`/fixtures/${doc.fixture_id}`}
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                {doc.fixture_title || doc.fixture_number}
                <ExternalLink className="h-3 w-3" />
              </a>
            </Row>
          )}
          {doc.model && (
            <Row label="Model">
              <span className="text-slate-700 truncate max-w-[180px]">{doc.model}</span>
            </Row>
          )}
          <Row label="Created">
            <span className="text-slate-700">
              {doc.created_at
                ? new Date(doc.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          </Row>
        </div>

        <div className="pt-2">
          <a
            href={`/fixtures/${doc.fixture_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Fixture
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </div>
  );
}
