"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageCircle,
  Send,
  Loader2,
  Plus,
  Users,
  Paperclip,
  Hash,
} from "lucide-react";
import { quintApi } from "@/lib/api";
import { isSpoofAuthToken } from "@/lib/spoof";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { NewRoomDialog } from "@/components/chat/new-room-dialog";

/* ── Quint API response shapes ── */

interface QuintRoom {
  room_id: string;
  name: string;
  member_count: number;
  is_direct?: boolean;
}

interface MatrixEvent {
  event_id: string;
  type: string;
  sender: string;
  origin_server_ts: number;
  content: {
    body?: string;
    msgtype?: string;
    "m.file"?: { file_url?: string; file_name?: string };
    [key: string]: unknown;
  };
}

interface MessagesResponse {
  success: boolean;
  messages?: MatrixEvent[];
  chunk?: MatrixEvent[];
  end?: string;
}

/* ── helpers ── */

function senderInitials(sender: string): string {
  const local = sender.replace(/^@/, "").split(":")[0];
  const parts = local.split(/[._-]/);
  return (
    (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
  ).toUpperCase() || "?";
}

function senderDisplayName(sender: string): string {
  const local = sender.replace(/^@/, "").split(":")[0];
  return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffMs < 604800000) {
    return d.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── component ── */

export default function ChatPage() {
  const { matrixUserId, token } = useAuthStore();
  const isSpoof = isSpoofAuthToken(token);

  const [rooms, setRooms] = useState<QuintRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<QuintRoom | null>(null);

  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [showNewRoom, setShowNewRoom] = useState(false);

  /** Local-only messages in spoof mode (never sent to Matrix). */
  const [spoofLocalByRoom, setSpoofLocalByRoom] = useState<
    Record<string, MatrixEvent[]>
  >({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* fetch rooms */
  const fetchRooms = useCallback(async () => {
    try {
      const res = await quintApi.get<{ success: boolean; rooms: QuintRoom[] }>(
        "/v1/rooms?limit=50",
      );
      if (res.rooms) setRooms(res.rooms);
    } catch {
      /* degrade */
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  /* fetch messages for selected room */
  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await quintApi.get<MessagesResponse>(
        `/v1/messages/get?room_id=${encodeURIComponent(roomId)}&limit=50`,
      );
      const msgs = res.messages ?? res.chunk ?? [];
      const textMsgs = msgs.filter(
        (e) => e.type === "m.room.message" && e.content?.body,
      );
      textMsgs.sort((a, b) => a.origin_server_ts - b.origin_server_ts);
      setMessages(textMsgs);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    setMsgsLoading(true);
    fetchMessages(selectedRoom.room_id).finally(() => setMsgsLoading(false));

    if (pollRef.current) clearInterval(pollRef.current);
    if (!isSpoof) {
      pollRef.current = setInterval(
        () => fetchMessages(selectedRoom.room_id),
        5000,
      );
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedRoom, fetchMessages, isSpoof]);

  const displayMessages = (() => {
    if (!selectedRoom) return messages;
    const extra = spoofLocalByRoom[selectedRoom.room_id] ?? [];
    const merged = [...messages, ...extra];
    merged.sort((a, b) => a.origin_server_ts - b.origin_server_ts);
    return merged;
  })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, spoofLocalByRoom, selectedRoom?.room_id]);

  /* send message via Matrix (or local-only in spoof mode) */
  const handleSend = async () => {
    if (!draft.trim() || !selectedRoom || !matrixUserId) return;
    if (isSpoof) {
      const text = draft.trim();
      const ev: MatrixEvent = {
        event_id: `spoof_${Date.now()}`,
        type: "m.room.message",
        sender: matrixUserId,
        origin_server_ts: Date.now(),
        content: { msgtype: "m.text", body: text },
      };
      setSpoofLocalByRoom((prev) => ({
        ...prev,
        [selectedRoom.room_id]: [...(prev[selectedRoom.room_id] ?? []), ev],
      }));
      setDraft("");
      return;
    }
    setSending(true);
    try {
      const txnId = `m${Date.now()}`;
      await api_matrixSend(selectedRoom.room_id, txnId, draft.trim());
      setDraft("");
      await fetchMessages(selectedRoom.room_id);
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  /* file upload */
  const handleFileUpload = async () => {
    if (!selectedRoom) return;
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("roomId", selectedRoom.room_id);
        await quintApi.postFormData("/v1/files/upload", fd);
        await fetchMessages(selectedRoom.room_id);
      } catch {
        /* ignore */
      }
    };
    input.click();
  };

  const handleRoomCreated = (roomId: string, name: string) => {
    const newRoom: QuintRoom = {
      room_id: roomId,
      name,
      member_count: 1,
    };
    setRooms((prev) => [newRoom, ...prev]);
    setSelectedRoom(newRoom);
    setShowNewRoom(false);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Room list */}
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-200">
        <div className="flex h-14 flex-col justify-center gap-1 border-b border-slate-100 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Rooms</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewRoom(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {isSpoof && (
            <p className="text-[10px] text-amber-600 leading-tight">
              Offline demo — nothing is sent to the server
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {roomsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              No rooms yet
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.room_id}
                onClick={() => setSelectedRoom(room)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                  selectedRoom?.room_id === room.room_id && "bg-blue-50",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  {room.is_direct ? (
                    <MessageCircle className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Hash className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {room.name || room.room_id}
                  </p>
                  <p className="text-xs text-slate-400">
                    <Users className="mr-1 inline h-3 w-3" />
                    {room.member_count} member{room.member_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col">
        {selectedRoom ? (
          <>
            {/* Room header */}
            <div className="flex h-14 items-center gap-3 border-b border-slate-100 px-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                {selectedRoom.is_direct ? (
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                ) : (
                  <Hash className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedRoom.name || selectedRoom.room_id}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedRoom.member_count} member{selectedRoom.member_count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
              {msgsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Send the first message to start the conversation.
                  </p>
                </div>
              ) : (
                displayMessages.map((msg) => {
                  const isMe = msg.sender === matrixUserId;
                  return (
                    <div
                      key={msg.event_id}
                      className={cn("flex gap-3", isMe && "flex-row-reverse")}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={cn(
                            "text-xs",
                            isMe
                              ? "bg-blue-600 text-white"
                              : "bg-slate-200 text-slate-600",
                          )}
                        >
                          {senderInitials(msg.sender)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5",
                          isMe
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-slate-100 text-slate-900 rounded-bl-md",
                        )}
                      >
                        {!isMe && (
                          <p className="text-[11px] font-semibold text-slate-500 mb-0.5">
                            {senderDisplayName(msg.sender)}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content.body}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isMe ? "text-blue-200" : "text-slate-400",
                          )}
                        >
                          {formatTime(msg.origin_server_ts)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Compose */}
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-slate-400 hover:text-slate-600"
                  onClick={handleFileUpload}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 h-10"
                  disabled={sending}
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageCircle className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-semibold text-slate-700">
              Select a room to start chatting
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Or create a new room with the + button
            </p>
          </div>
        )}
      </div>

      <NewRoomDialog
        open={showNewRoom}
        onOpenChange={setShowNewRoom}
        onCreated={handleRoomCreated}
      />
    </div>
  );
}

async function api_matrixSend(roomId: string, txnId: string, body: string) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("auth-token")
      : null;
  if (isSpoofAuthToken(token)) {
    throw new Error("Spoof mode: use local send path");
  }
  const res = await fetch(
    `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ msgtype: "m.text", body }),
    },
  );
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}
