"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  Upload,
  File,
  Loader2,
  Trash2,
  Download,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DOC_TYPES = [
  "All",
  "Recap",
  "Charter Party",
  "Addendum",
  "Report",
  "Note",
  "Uploaded Reference",
] as const;

const DOC_TYPE_VALUES = [
  "recap",
  "charter_party",
  "addendum",
  "report",
  "note",
  "uploaded_reference",
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  generated: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  superseded: "bg-slate-200 text-slate-500",
  archived: "bg-slate-200 text-slate-500",
};

const TYPE_ICONS: Record<string, string> = {
  recap: "bg-purple-100 text-purple-600",
  charter_party: "bg-blue-100 text-blue-600",
  addendum: "bg-indigo-100 text-indigo-600",
  report: "bg-emerald-100 text-emerald-600",
  note: "bg-amber-100 text-amber-600",
  uploaded_reference: "bg-slate-100 text-slate-600",
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

interface LocalDoc {
  id: string;
  title: string;
  document_type: string;
  status: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  fixture_label: string | null;
  version_number: number;
  created_at: string;
  updated_at: string;
}

export default function DocumentsPage() {
  const [activeType, setActiveType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [documents, setDocuments] = useState<LocalDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LocalDoc | null>(null);

  const [form, setForm] = useState({
    title: "",
    document_type: "uploaded_reference" as string,
    fixture_label: "",
  });
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    if (!form.title.trim()) return;
    setUploading(true);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newDoc: LocalDoc = {
      id,
      title: form.title.trim(),
      document_type: form.document_type,
      status: "draft",
      file_name: pickedFile?.name ?? null,
      file_size: pickedFile?.size ?? null,
      mime_type: pickedFile?.type ?? null,
      fixture_label: form.fixture_label.trim() || null,
      version_number: 1,
      created_at: now,
      updated_at: now,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setForm({ title: "", document_type: "uploaded_reference", fixture_label: "" });
    setPickedFile(null);
    setUploading(false);
    setShowUpload(false);
  };

  const deleteDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  const typeFilter = activeType === "All" ? null : activeType.toLowerCase().replace(/ /g, "_");
  const filtered = documents.filter((d) => {
    if (typeFilter && d.document_type !== typeFilter) return false;
    if (
      searchQuery.trim() &&
      !d.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(d.file_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
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
            Recaps, charter parties, addenda, and reports
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Upload Document
        </button>
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
          <div className="text-right">Updated</div>
        </div>
        {filtered.length === 0 ? (
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
                : "Upload a document or generate one from a fixture"}
            </p>
            {!searchQuery && !typeFilter && (
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" />
                Upload your first document
              </button>
            )}
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
                    {doc.file_name && (
                      <p className="text-xs text-slate-400 truncate">
                        {doc.file_name}
                        {doc.file_size != null && ` · ${formatBytes(doc.file_size)}`}
                      </p>
                    )}
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
                  {doc.fixture_label || "—"}
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
                  {new Date(doc.updated_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
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
          onDelete={() => deleteDoc(selectedDoc.id)}
        />
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Recap — MV Ocean Star"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Document Type
              </label>
              <select
                value={form.document_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, document_type: e.target.value }))
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"
              >
                {DOC_TYPE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {typeLabel(v)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                Linked Fixture (optional)
              </label>
              <Input
                value={form.fixture_label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fixture_label: e.target.value }))
                }
                placeholder="e.g. FIX-0001"
              />
            </div>

            {/* File picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">File</label>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  setPickedFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              {pickedFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <File className="h-5 w-5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {pickedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatBytes(pickedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => setPickedFile(null)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-sm text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Upload className="h-5 w-5" />
                  Click to choose a file
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !form.title.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocDetailDrawer({
  doc,
  onClose,
  onDelete,
}: {
  doc: LocalDoc;
  onClose: () => void;
  onDelete: () => void;
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
          {doc.fixture_label && (
            <Row label="Fixture">
              <span className="text-slate-700">{doc.fixture_label}</span>
            </Row>
          )}
          {doc.file_name && (
            <Row label="File">
              <span className="text-slate-700 truncate">{doc.file_name}</span>
            </Row>
          )}
          {doc.file_size != null && (
            <Row label="Size">
              <span className="text-slate-700">{formatBytes(doc.file_size)}</span>
            </Row>
          )}
          {doc.mime_type && (
            <Row label="Type">
              <span className="text-slate-700">{doc.mime_type}</span>
            </Row>
          )}
          <Row label="Created">
            <span className="text-slate-700">
              {new Date(doc.created_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </Row>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
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
