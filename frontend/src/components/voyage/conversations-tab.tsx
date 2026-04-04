"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  Conversation,
  ConversationType,
  Message,
  MessageSource,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Send,
  MessageSquare,
  Lock,
  Globe,
  Handshake,
  Mail,
  Bot,
  Monitor,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const TYPE_CONFIG: Record<
  ConversationType,
  { label: string; icon: React.ElementType; className: string }
> = {
  [ConversationType.INTERNAL]: {
    label: "Internal",
    icon: Lock,
    className: "bg-slate-100 text-slate-700",
  },
  [ConversationType.EXTERNAL]: {
    label: "External",
    icon: Globe,
    className: "bg-blue-50 text-blue-700",
  },
  [ConversationType.NEGOTIATION]: {
    label: "Negotiation",
    icon: Handshake,
    className: "bg-amber-50 text-amber-700",
  },
};

const SOURCE_ICON: Record<string, React.ElementType> = {
  [MessageSource.EMAIL]: Mail,
  [MessageSource.API]: Bot,
  [MessageSource.PLATFORM]: Monitor,
};

interface ConversationsTabProps {
  voyageId: string;
}

export function ConversationsTab({ voyageId }: ConversationsTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<ConversationType>(
    ConversationType.INTERNAL,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConvos } = useQuery<
    Conversation[]
  >({
    queryKey: ["voyages", voyageId, "conversations"],
    queryFn: () =>
      api.get(`/voyages/${voyageId}/conversations`),
  });

  // Auto-select first
  useEffect(() => {
    if (conversations.length > 0 && !selectedId) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery<
    Message[]
  >({
    queryKey: ["conversations", selectedId, "messages"],
    queryFn: () => api.get(`/conversations/${selectedId}/messages`),
    enabled: !!selectedId,
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post<Message>(`/conversations/${selectedId}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", selectedId, "messages"],
      });
      setNewMsg("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Create conversation
  const createMutation = useMutation({
    mutationFn: () =>
      api.post<Conversation>(`/voyages/${voyageId}/conversations`, {
        title: createTitle,
        type: createType,
      }),
    onSuccess: (convo) => {
      queryClient.invalidateQueries({
        queryKey: ["voyages", voyageId, "conversations"],
      });
      setSelectedId(convo.id);
      setShowCreate(false);
      setCreateTitle("");
      toast.success("Conversation created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete message
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      api.delete(`/conversations/${selectedId}/messages/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", selectedId, "messages"],
      });
      toast.success("Message deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Edit message
  const editMutation = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      api.patch(`/conversations/${selectedId}/messages/${messageId}`, {
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", selectedId, "messages"],
      });
      setEditingId(null);
      toast.success("Message updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSend = useCallback(() => {
    const text = newMsg.trim();
    if (!text || !selectedId) return;
    sendMutation.mutate(text);
  }, [newMsg, selectedId, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) {
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays < 7) {
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[600px] rounded-lg border bg-card overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-sm font-semibold">Conversations</h3>
          <Button size="sm" variant="ghost" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {loadingConvos ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1.5 p-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Start one
              </Button>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {conversations.map((convo) => {
                const cfg = TYPE_CONFIG[convo.type];
                const Icon = cfg.icon;
                const isSelected = convo.id === selectedId;
                return (
                  <button
                    key={convo.id}
                    onClick={() => setSelectedId(convo.id)}
                    className={`w-full text-left rounded-md p-2.5 transition-colors ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate flex-1">
                        {convo.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${cfg.className}`}
                      >
                        {cfg.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(convo.updatedAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <h3 className="text-sm font-semibold truncate flex-1">
                {selected.title}
              </h3>
              <Badge
                variant="outline"
                className={TYPE_CONFIG[selected.type].className}
              >
                {TYPE_CONFIG[selected.type].label}
              </Badge>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-24 rounded bg-muted" />
                        <div className="h-4 w-64 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const sender = msg.sender;
                    const initials = sender
                      ? `${sender.firstName?.[0] ?? ""}${sender.lastName?.[0] ?? ""}`
                      : "?";
                    const isOwn = user?.id === msg.senderId;
                    const SourceIcon =
                      SOURCE_ICON[msg.source] ?? Monitor;

                    return (
                      <div
                        key={msg.id}
                        className="group flex gap-3"
                      >
                        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {sender
                                ? `${sender.firstName} ${sender.lastName}`
                                : "Unknown"}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <SourceIcon className="h-3 w-3" />
                              {formatTime(msg.createdAt)}
                            </span>
                            {/* Actions */}
                            {isOwn && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingId(msg.id);
                                      setEditText(msg.content);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                      deleteMutation.mutate(msg.id)
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {editingId === msg.id ? (
                            <div className="mt-1 space-y-2">
                              <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={2}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    editMutation.mutate({
                                      messageId: msg.id,
                                      content: editText,
                                    })
                                  }
                                  disabled={editMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm mt-0.5 whitespace-pre-wrap text-foreground/90">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="resize-none text-sm min-h-[40px]"
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!newMsg.trim() || sendMutation.isPending}
                  className="shrink-0"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select or create a conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Create a new conversation thread for this voyage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g. Freight discussion, CP terms..."
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={createType}
                onValueChange={(v) => setCreateType(v as ConversationType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ConversationType.INTERNAL}>
                    Internal
                  </SelectItem>
                  <SelectItem value={ConversationType.EXTERNAL}>
                    External
                  </SelectItem>
                  <SelectItem value={ConversationType.NEGOTIATION}>
                    Negotiation
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!createTitle.trim() || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
