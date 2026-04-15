"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Send,
  Users,
  ArrowLeft,
  Smile,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { ChatAttachmentMenu } from "@/components/chat/chat-attachment-menu";
import { ChatAttachmentView } from "@/components/chat/chat-attachment-view";
import { cn } from "@/lib/utils";
import { getAvatarSrc } from "@/lib/avatar-url";
import { Chat, ChatMessage as ChatMessageType } from "@/types";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateSeparator(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface MessageGroup {
  date: string;
  messages: ChatMessageType[];
}

function groupByDate(messages: ChatMessageType[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let current: MessageGroup | null = null;

  for (const m of messages) {
    const date = new Date(m.sentAt).toDateString();
    if (!current || current.date !== date) {
      current = { date, messages: [] };
      groups.push(current);
    }
    current.messages.push(m);
  }
  return groups;
}

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
}

export function ChatWindow({ chat, onBack }: ChatWindowProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessageType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: ChatMessageType[]; meta: unknown }>(
        `/chats/${chat.id}/messages`,
      );
      setMessages(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [chat.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }, 50);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get<{ data: ChatMessageType[]; meta: unknown }>(
          `/chats/${chat.id}/messages`,
        );
        setMessages(res.data);
      } catch {
        // ignore
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [chat.id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const optimistic: ChatMessageType = {
      id: `temp-${Date.now()}`,
      chatId: chat.id,
      senderUserId: user?.id ?? "",
      body: text,
      sentAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      sender: {
        id: user?.id ?? "",
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        email: user?.email ?? "",
        avatarUrl: user?.avatarUrl ?? null,
      },
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      setSending(true);
      await api.post(`/chats/${chat.id}/messages`, { body: text });
      const res = await api.get<{ data: ChatMessageType[]; meta: unknown }>(
        `/chats/${chat.id}/messages`,
      );
      setMessages(res.data);
    } catch {
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id),
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/chats/${chat.id}/messages/${deleteTarget.id}`);
      setDeleteTarget(null);
      const res = await api.get<{ data: ChatMessageType[]; meta: unknown }>(
        `/chats/${chat.id}/messages`,
      );
      setMessages(res.data);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const handlePickFile = async (file: File) => {
    if (sending) return;
    const caption = input.trim();
    const fd = new FormData();
    fd.append("file", file);
    if (caption) fd.append("caption", caption);
    setInput("");

    try {
      setSending(true);
      await api.postFormData<ChatMessageType>(
        `/chats/${chat.id}/messages/media`,
        fd,
      );
      const res = await api.get<{ data: ChatMessageType[]; meta: unknown }>(
        `/chats/${chat.id}/messages`,
      );
      setMessages(res.data);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const groups = useMemo(() => groupByDate(messages), [messages]);
  const memberCount = chat.members.length;

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <button
          onClick={onBack}
          className="mr-1 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={getAvatarSrc(chat.avatarUrl)} />
          <AvatarFallback
            className={cn(
              "text-xs font-medium text-white",
              chat.chatType === "GROUP" ? "bg-emerald-500" : "bg-blue-500",
            )}
          >
            {chat.chatType === "GROUP" ? (
              <Users className="h-5 w-5" />
            ) : (
              initials(
                chat.name?.split(" ")[0] ?? "",
                chat.name?.split(" ")[1] ?? "",
              )
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {chat.name}
          </h3>
          <p className="text-xs text-slate-500">
            {chat.chatType === "GROUP"
              ? `${memberCount} member${memberCount !== 1 ? "s" : ""}`
              : "Direct message"}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-900/50">
        <div ref={scrollViewportRef} className="px-4 py-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Smile className="mb-3 h-12 w-12" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs">Send a message to start the conversation</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                    {dateSeparator(group.messages[0].sentAt)}
                  </span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                {group.messages.map((msg, i) => {
                  const isMe = msg.senderUserId === user?.id;
                  const prev = group.messages[i - 1];
                  const showAvatar =
                    !isMe &&
                    (!prev || prev.senderUserId !== msg.senderUserId);

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "group/msg mb-1 flex",
                        isMe ? "justify-end" : "justify-start",
                      )}
                    >
                      {!isMe && (
                        <div className="mr-2 w-8 shrink-0">
                          {showAvatar && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={getAvatarSrc(msg.sender.avatarUrl)}
                              />
                              <AvatarFallback className="bg-slate-300 text-[10px] text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                                {initials(
                                  msg.sender.firstName,
                                  msg.sender.lastName,
                                )}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          "relative max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                          isMe
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md bg-white text-slate-900 dark:bg-slate-800 dark:text-white",
                          msg.deletedAt &&
                            isMe &&
                            "bg-blue-600/85 text-blue-50",
                          msg.deletedAt &&
                            !isMe &&
                            "border border-dashed border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-400",
                        )}
                      >
                        {isMe && !msg.deletedAt && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="absolute right-1 top-1 rounded-md p-0.5 text-blue-100 opacity-0 transition-opacity hover:bg-white/15 group-hover/msg:opacity-100"
                                aria-label="Message options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onClick={() => setDeleteTarget(msg)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete for everyone
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {!isMe && showAvatar && chat.chatType === "GROUP" && (
                          <p className="mb-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {msg.sender.firstName} {msg.sender.lastName}
                          </p>
                        )}
                        {msg.deletedAt ? (
                          <p
                            className={cn(
                              "pr-6 text-sm italic",
                              isMe ? "text-blue-100" : "",
                            )}
                          >
                            {isMe
                              ? "You deleted this message"
                              : "This message was deleted"}
                          </p>
                        ) : (
                          <>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="space-y-1">
                                {msg.attachments.map((att) => (
                                  <ChatAttachmentView
                                    key={att.id}
                                    attachment={att}
                                    isMe={!!isMe}
                                  />
                                ))}
                              </div>
                            )}
                            {msg.body?.trim() ? (
                              <p className="whitespace-pre-wrap break-words">
                                {msg.body}
                              </p>
                            ) : null}
                          </>
                        )}
                        <p
                          className={cn(
                            "mt-1 text-right text-[10px]",
                            isMe
                              ? "text-blue-200"
                              : "text-slate-400 dark:text-slate-500",
                          )}
                        >
                          {formatTime(msg.sentAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-end gap-1">
          <ChatAttachmentMenu
            disabled={sending}
            onPickFile={handlePickFile}
          />
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Type a message"
              rows={1}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
              style={{ maxHeight: 120 }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
              input.trim()
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>
              This removes the message for everyone in the chat, including any
              photos, videos, or files. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? "Deleting…" : "Delete for everyone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
