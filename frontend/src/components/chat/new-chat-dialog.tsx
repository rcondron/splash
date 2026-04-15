"use client";

import { useEffect, useState } from "react";
import { Search, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { User, Chat } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAvatarSrc } from "@/lib/avatar-url";

function initials(u: User) {
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}

// ─── New Direct Chat ───

interface NewDirectChatDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (chat: Chat) => void;
}

export function NewDirectChatDialog({
  open,
  onOpenChange,
  onCreated,
}: NewDirectChatDialogProps) {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get<User[]>("/users")
      .then((res) => setUsers(res.filter((u) => u.id !== me?.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, me?.id]);

  const filtered = users.filter(
    (u) =>
      `${u.firstName} ${u.lastName} ${u.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  const handleSelect = async (userId: string) => {
    try {
      setCreating(userId);
      const chat = await api.post<Chat>("/chats/direct", { userId });
      onCreated(chat);
      onOpenChange(false);
    } catch {
      // ignore
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
          <DialogDescription>
            Select a person to start a conversation
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="pl-9"
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No users found
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u.id)}
                  disabled={creating === u.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={getAvatarSrc(u.avatarUrl)} />
                    <AvatarFallback className="bg-blue-500 text-xs text-white">
                      {initials(u)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {u.email}
                    </p>
                  </div>
                  {creating === u.id && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Group Chat ───

interface NewGroupChatDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (chat: Chat) => void;
}

export function NewGroupChatDialog({
  open,
  onOpenChange,
  onCreated,
}: NewGroupChatDialogProps) {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [step, setStep] = useState<"select" | "name">("select");

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setGroupName("");
      setStep("select");
      setQuery("");
      return;
    }
    setLoading(true);
    api
      .get<User[]>("/users")
      .then((res) => setUsers(res.filter((u) => u.id !== me?.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, me?.id]);

  const filtered = users.filter(
    (u) =>
      `${u.firstName} ${u.lastName} ${u.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.size === 0) return;
    try {
      setCreating(true);
      const chat = await api.post<Chat>("/chats/group", {
        name: groupName.trim(),
        memberIds: Array.from(selected),
      });
      onCreated(chat);
      onOpenChange(false);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "New Group" : "Group Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Select members for your group"
              : "Give your group a name"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people..."
                className="pl-9"
              />
            </div>

            {selected.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selected).map((id) => {
                  const u = users.find((u) => u.id === id);
                  if (!u) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => toggle(id)}
                      className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                    >
                      {u.firstName}
                      <span className="text-blue-400">&times;</span>
                    </button>
                  );
                })}
              </div>
            )}

            <ScrollArea className="max-h-[250px]">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggle(u.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                        selected.has(u.id) && "bg-blue-50 dark:bg-blue-950/30",
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={getAvatarSrc(u.avatarUrl)} />
                        <AvatarFallback className="bg-blue-500 text-xs text-white">
                          {initials(u)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {u.email}
                        </p>
                      </div>
                      {selected.has(u.id) && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep("name")}
                disabled={selected.size === 0}
              >
                Next ({selected.size} selected)
              </Button>
            </div>
          </>
        ) : (
          <>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <p className="text-xs text-slate-500">
              {selected.size} member{selected.size !== 1 ? "s" : ""} selected
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!groupName.trim() || creating}
              >
                {creating ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
