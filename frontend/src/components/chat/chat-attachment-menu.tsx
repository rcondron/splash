"use client";

import { useRef } from "react";
import { Image as ImageIcon, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatAttachmentMenuProps {
  disabled?: boolean;
  onPickFile: (file: File) => void;
}

export function ChatAttachmentMenu({
  disabled,
  onPickFile,
}: ChatAttachmentMenuProps) {
  const photosRef = useRef<HTMLInputElement>(null);
  const docsRef = useRef<HTMLInputElement>(null);

  const handleChange = (input: React.RefObject<HTMLInputElement | null>) => () => {
    const el = input.current;
    if (!el?.files?.length) return;
    const file = el.files[0];
    if (file) onPickFile(file);
    el.value = "";
  };

  return (
    <>
      <input
        ref={photosRef}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={handleChange(photosRef)}
      />
      <input
        ref={docsRef}
        type="file"
        className="hidden"
        accept="*/*"
        onChange={handleChange(docsRef)}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
              disabled
                ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white",
            )}
            aria-label="Attach file"
          >
            <Plus className="h-6 w-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuItem
            onClick={() => photosRef.current?.click()}
            className="cursor-pointer gap-2"
          >
            <ImageIcon className="h-4 w-4 text-emerald-600" />
            <div className="flex flex-col">
              <span className="font-medium">Photos & videos</span>
              <span className="text-xs text-muted-foreground">
                From your device
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => docsRef.current?.click()}
            className="cursor-pointer gap-2"
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="font-medium">Document</span>
              <span className="text-xs text-muted-foreground">
                Files and other types
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
