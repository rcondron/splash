"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Download } from "lucide-react";
import { api } from "@/lib/api";
import { ChatMessageAttachment } from "@/types";
import { cn } from "@/lib/utils";

function useAttachmentBlobUrl(attachmentId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    urlRef.current = null;
    setUrl(null);
    setError(false);

    api
      .getBlob(`/chats/attachments/${attachmentId}/download`)
      .then((blob) => {
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [attachmentId]);

  return { url, error };
}

export function ChatAttachmentView({
  attachment,
  isMe,
}: {
  attachment: ChatMessageAttachment;
  isMe: boolean;
}) {
  const { url, error } = useAttachmentBlobUrl(attachment.id);

  if (attachment.kind === "IMAGE") {
    return (
      <div className="mb-1 overflow-hidden rounded-lg">
        {!url && !error && (
          <div
            className={cn(
              "flex h-40 w-56 max-w-full items-center justify-center rounded-lg bg-black/10",
              isMe ? "bg-white/10" : "bg-black/5",
            )}
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
          </div>
        )}
        {error && (
          <p className="text-xs opacity-80">Could not load image</p>
        )}
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={attachment.originalFilename}
            className="max-h-72 max-w-full rounded-lg object-cover"
          />
        )}
      </div>
    );
  }

  if (attachment.kind === "VIDEO") {
    return (
      <div className="mb-1 max-w-full overflow-hidden rounded-lg">
        {!url && !error && (
          <div
            className={cn(
              "flex h-40 w-56 max-w-full items-center justify-center rounded-lg bg-black/10",
              isMe ? "bg-white/10" : "bg-black/5",
            )}
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
          </div>
        )}
        {error && (
          <p className="text-xs opacity-80">Could not load video</p>
        )}
        {url && (
          <video
            src={url}
            controls
            className="max-h-72 max-w-full rounded-lg"
            playsInline
          />
        )}
      </div>
    );
  }

  return (
    <a
      href="#"
      onClick={async (e) => {
        e.preventDefault();
        try {
          const blob = await api.getBlob(
            `/chats/attachments/${attachment.id}/download`,
          );
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = attachment.originalFilename;
          a.click();
          URL.revokeObjectURL(a.href);
        } catch {
          // ignore
        }
      }}
      className={cn(
        "mb-1 flex max-w-[260px] items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-opacity hover:opacity-90",
        isMe
          ? "bg-white/15 text-white"
          : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-white",
      )}
    >
      <FileText className="h-8 w-8 shrink-0 opacity-90" />
      <span className="min-w-0 flex-1 truncate font-medium">
        {attachment.originalFilename}
      </span>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}
