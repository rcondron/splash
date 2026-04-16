"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Search,
  Send,
  Loader2,
  Plus,
  Smile,
} from "lucide-react";
import { quintApi } from "@/lib/api";
import { isSpoofAuthToken } from "@/lib/spoof";
import { useAuthStore } from "@/store/auth";
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

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function roomColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function roomInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function senderInitials(sender: string): string {
  const local = sender.replace(/^@/, "").split(":")[0];
  const parts = local.split(/[._-]/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function senderDisplayName(sender: string): string {
  const local = sender.replace(/^@/, "").split(":")[0];
  return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffMs < 86400000 * 2) return "Yesterday";
  if (diffMs < 604800000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMsgTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ── component ── */

export default function ChatPage() {
  const { matrixUserId, token } = useAuthStore();
  const isSpoof = isSpoofAuthToken(token);

  const [rooms, setRooms] = useState<QuintRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<QuintRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [showNewRoom, setShowNewRoom] = useState(false);

  const [spoofLocalByRoom, setSpoofLocalByRoom] = useState<
    Record<string, MatrixEvent[]>
  >({});

  const [lastMessages, setLastMessages] = useState<
    Record<string, MatrixEvent | null>
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

  /* fetch last message for each room (for sidebar preview) */
  useEffect(() => {
    if (rooms.length === 0) return;
    rooms.forEach(async (room) => {
      try {
        const res = await quintApi.get<MessagesResponse>(
          `/v1/messages/get?room_id=${encodeURIComponent(room.room_id)}&limit=1`,
        );
        const msgs = res.messages ?? res.chunk ?? [];
        const textMsgs = msgs.filter(
          (e) => e.type === "m.room.message" && e.content?.body,
        );
        setLastMessages((prev) => ({
          ...prev,
          [room.room_id]: textMsgs[0] ?? null,
        }));
      } catch {
        /* ignore */
      }
    });
  }, [rooms]);

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

  /* send message */
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
  const handleFileUpload = () => {
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

  const filteredRooms = searchQuery.trim()
    ? rooms.filter((r) =>
        (r.name || r.room_id).toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : rooms;

  /* sidebar last-message preview text */
  function previewText(room: QuintRoom): string {
    const spoofMsgs = spoofLocalByRoom[room.room_id];
    const lastSpoof = spoofMsgs?.length ? spoofMsgs[spoofMsgs.length - 1] : null;
    const lastFetched = lastMessages[room.room_id];
    const latest = lastSpoof && (!lastFetched || lastSpoof.origin_server_ts > lastFetched.origin_server_ts)
      ? lastSpoof
      : lastFetched;
    if (!latest) return "";
    const sender = senderDisplayName(latest.sender).split(" ")[0];
    const body = latest.content.body ?? "";
    const isImage = latest.content.msgtype === "m.image";
    const preview = isImage ? "Photo" : body;
    return `${sender}: ${preview}`;
  }

  function previewTimestamp(room: QuintRoom): string {
    const spoofMsgs = spoofLocalByRoom[room.room_id];
    const lastSpoof = spoofMsgs?.length ? spoofMsgs[spoofMsgs.length - 1] : null;
    const lastFetched = lastMessages[room.room_id];
    const latest = lastSpoof && (!lastFetched || lastSpoof.origin_server_ts > lastFetched.origin_server_ts)
      ? lastSpoof
      : lastFetched;
    if (!latest) return "";
    return formatTimestamp(latest.origin_server_ts);
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* ── Sidebar: Chat list ── */}
      <div className="flex w-[380px] shrink-0 flex-col border-r border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h1 className="text-xl font-bold text-slate-900">Chats</h1>
          <button
            onClick={() => setShowNewRoom(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-300 focus:bg-white transition-colors"
            />
          </div>
          {isSpoof && (
            <p className="mt-2 text-[10px] text-amber-600 leading-tight">
              Offline demo — nothing is sent to the server
            </p>
          )}
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {roomsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-slate-400">
              {searchQuery ? "No chats found" : "No chats yet"}
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = selectedRoom?.room_id === room.room_id;
              const color = roomColor(room.room_id);
              const preview = previewText(room);
              const ts = previewTimestamp(room);

              return (
                <button
                  key={room.room_id}
                  onClick={() => setSelectedRoom(room)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors border-b border-slate-100",
                    isActive
                      ? "bg-slate-100"
                      : "hover:bg-slate-50",
                  )}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback
                      className={cn("text-sm font-semibold text-white", color)}
                    >
                      {roomInitials(room.name || room.room_id)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[15px] font-semibold text-slate-900 truncate">
                        {room.name || room.room_id}
                      </p>
                      {ts && (
                        <span className="ml-2 shrink-0 text-xs text-slate-400">
                          {ts}
                        </span>
                      )}
                    </div>
                    {preview && (
                      <p className="mt-0.5 text-sm text-slate-500 truncate">
                        {preview}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main: Conversation area ── */}
      <div className="flex flex-1 flex-col bg-white">
        {selectedRoom ? (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback
                  className={cn(
                    "text-sm font-semibold text-white",
                    roomColor(selectedRoom.room_id),
                  )}
                >
                  {roomInitials(selectedRoom.name || selectedRoom.room_id)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[15px] font-semibold text-slate-900">
                  {selectedRoom.name || selectedRoom.room_id}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedRoom.is_direct
                    ? "Direct message"
                    : `${selectedRoom.member_count} member${selectedRoom.member_count !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-4">
              {msgsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/70">
                    <Smile className="h-9 w-9 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">No messages yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Send a message to start the conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {displayMessages.map((msg, idx) => {
                    const isMe = msg.sender === matrixUserId;
                    const prevMsg = displayMessages[idx - 1];
                    const showSender =
                      !isMe &&
                      (!prevMsg || prevMsg.sender !== msg.sender ||
                        msg.origin_server_ts - prevMsg.origin_server_ts > 60000);

                    return (
                      <div
                        key={msg.event_id}
                        className={cn(
                          "flex",
                          isMe ? "justify-end" : "justify-start",
                          showSender && idx > 0 ? "mt-3" : "",
                        )}
                      >
                        <div
                          className={cn(
                            "relative max-w-[65%] rounded-lg px-3 py-2 shadow-sm",
                            isMe
                              ? "bg-blue-500 text-white"
                              : "bg-white text-slate-900",
                          )}
                        >
                          {showSender && (
                            <p className="mb-0.5 text-xs font-semibold text-blue-500">
                              {senderDisplayName(msg.sender)}
                            </p>
                          )}
                          <p className="text-[14px] leading-relaxed whitespace-pre-wrap pr-12">
                            {msg.content.body}
                          </p>
                          <span
                            className={cn(
                              "absolute bottom-1.5 right-2.5 text-[10px] leading-none",
                              isMe ? "text-blue-200" : "text-slate-400",
                            )}
                          >
                            {formatMsgTime(msg.origin_server_ts)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Compose bar */}
            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFileUpload}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  placeholder="Type a message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-300 focus:bg-white transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                    draft.trim()
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "text-slate-300",
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state — no room selected */
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/70">
              <Smile className="h-9 w-9 text-slate-400" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              Select a chat to start messaging
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Or create a new chat with the + button
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
