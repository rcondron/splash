"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Download,
  Eye,
  EyeOff,
  File,
  FileText,
  Image,
  Loader2,
  Paperclip,
  RefreshCw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { quintApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface SharedFile {
  file_id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  sender_id: string | null;
  matrix_event_id: string | null;
  created_at: string | null;
  attach_status: "attached" | "ignored" | null;
}

interface Props {
  fixtureId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (!mime) return File;
  if (mime.startsWith("image/")) return Image;
  if (mime.includes("pdf") || mime.includes("document")) return FileText;
  return File;
}

function senderName(senderId: string | null): string {
  if (!senderId) return "Unknown";
  return senderId.split(":", 1)[0].replace(/^@/, "");
}

export function FixtureFilesTab({ fixtureId }: Props) {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "attached" | "ignored">("all");

  const load = useCallback(async () => {
    try {
      const res = await quintApi.get<{ files: SharedFile[] }>(
        `/v1/fixtures/${fixtureId}/shared-files`,
      );
      setFiles(res.files || []);
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (file: SharedFile, status: "attached" | "ignored") => {
    setActioning(file.file_id);
    try {
      await quintApi.put(`/v1/fixtures/${fixtureId}/attachments/${encodeURIComponent(file.file_id)}`, {
        status,
        file_name: file.file_name,
        file_size: file.file_size,
        mime_type: file.mime_type,
        sender_id: file.sender_id,
        matrix_event_id: file.matrix_event_id,
      });
      setFiles((prev) =>
        prev.map((f) =>
          f.file_id === file.file_id ? { ...f, attach_status: status } : f,
        ),
      );
      toast.success(status === "attached" ? "File attached to fixture" : "File ignored");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActioning(null);
    }
  };

  const filtered = files.filter((f) => {
    if (filter === "all") return true;
    if (filter === "pending") return f.attach_status === null;
    return f.attach_status === filter;
  });

  const pendingCount = files.filter((f) => f.attach_status === null).length;
  const attachedCount = files.filter((f) => f.attach_status === "attached").length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading shared files…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Documents &amp; Attachments
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Files shared in chat.{" "}
            {pendingCount > 0 && (
              <span className="font-medium text-amber-600">
                {pendingCount} pending review
              </span>
            )}
            {attachedCount > 0 && (
              <span className="ml-2 text-emerald-600">
                {attachedCount} attached
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setLoading(true); void load(); }}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["pending", `Pending (${pendingCount})`],
            ["attached", "Attached"],
            ["ignored", "Ignored"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Paperclip className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            No files shared in chat yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            When files are shared in this fixture&apos;s chat room they&apos;ll
            appear here for you to attach or ignore.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No files match this filter</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {filtered.map((file) => {
            const Icon = fileIcon(file.mime_type);
            const isPending = file.attach_status === null;
            const isAttached = file.attach_status === "attached";
            const isIgnored = file.attach_status === "ignored";
            const busy = actioning === file.file_id;

            return (
              <div
                key={file.file_id}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5",
                  isPending && "bg-amber-50/40",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isAttached
                      ? "bg-emerald-100 text-emerald-600"
                      : isIgnored
                        ? "bg-slate-100 text-slate-400"
                        : "bg-blue-100 text-blue-600",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {file.file_name || file.file_id}
                  </p>
                  <p className="text-xs text-slate-400">
                    {senderName(file.sender_id)}
                    {file.file_size != null && ` · ${formatBytes(file.file_size)}`}
                    {file.created_at &&
                      ` · ${new Date(file.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}`}
                  </p>
                </div>

                {/* Status badge or action buttons */}
                {isPending ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => void handleAction(file, "attached")}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Attach
                    </button>
                    <button
                      onClick={() => void handleAction(file, "ignored")}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <EyeOff className="h-3 w-3" />
                      Ignore
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        isAttached
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {file.attach_status}
                    </span>
                    {/* Allow changing decision */}
                    {isAttached && (
                      <button
                        onClick={() => void handleAction(file, "ignored")}
                        disabled={busy}
                        title="Remove from fixture"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isIgnored && (
                      <button
                        onClick={() => void handleAction(file, "attached")}
                        disabled={busy}
                        title="Attach to fixture"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Download link */}
                <a
                  href={`/quint-api/v1/files/${encodeURIComponent(file.file_id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
