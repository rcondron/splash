"use client";

import { useState } from "react";
import { Search, Plus, Users, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarSrc } from "@/lib/avatar-url";
import { Chat } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (chat: Chat) => void;
  onNewDirect: () => void;
  onNewGroup: () => void;
}

export function ChatList({
  chats,
  activeChatId,
  onSelect,
  onNewDirect,
  onNewGroup,
}: ChatListProps) {
  const [query, setQuery] = useState("");

  const filtered = chats.filter((c) =>
    c.name?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col border-r border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Chats
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
              <Plus className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onNewDirect}>
              <MessageCircle className="mr-2 h-4 w-4" />
              New Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNewGroup}>
              <Users className="mr-2 h-4 w-4" />
              New Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="h-9 pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <MessageCircle className="mb-2 h-10 w-10" />
            <p className="text-sm">No chats yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelect(chat)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  activeChatId === chat.id &&
                    "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/30",
                )}
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={getAvatarSrc(chat.avatarUrl)} />
                  <AvatarFallback
                    className={cn(
                      "text-xs font-medium text-white",
                      chat.chatType === "GROUP"
                        ? "bg-emerald-500"
                        : "bg-blue-500",
                    )}
                  >
                    {chat.chatType === "GROUP" ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      initials(chat.name || "?")
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {chat.name}
                    </span>
                    {chat.lastMessage && (
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {timeLabel(chat.lastMessage.sentAt)}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage ? (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {chat.chatType === "GROUP" && (
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {chat.lastMessage.sender.firstName}:{" "}
                        </span>
                      )}
                      {chat.lastMessage.preview ?? chat.lastMessage.body}
                    </p>
                  ) : (
                    <p className="text-xs italic text-slate-400">
                      No messages yet
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
