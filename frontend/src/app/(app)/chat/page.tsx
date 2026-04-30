"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Send,
  Loader2,
  Plus,
  Smile,
  Pencil,
  Check,
  X,
  User,
  Trash2,
  MoreVertical,
  Info,
  BellOff,
  Bell,
  Eraser,
  LogOut,
  File,
  FileText,
  FileArchive,
  Music,
  ChevronDown,
  Sparkles,
  Anchor,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { quintApi, sendMatrixRoomTextMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { NewRoomDialog } from "@/components/chat/new-room-dialog";
import { getSocket } from "@/lib/socket";
import {
  filterMessagesAfterClear,
  getChatClearCutoff,
  setChatClearCutoff,
} from "@/lib/chat-clear";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { mxcToMediaPath } from "@/lib/mxc-media";

type MessageStatus = "sending" | "sent" | "delivered" | "read";

/* ── WS / API response shapes ── */

interface WsRoom {
  room_id: string;
  name: string | null;
  member_count: number;
  is_direct: boolean;
  /** Matrix MXC URL for the other person’s avatar (two-member chats only). */
  avatar_url?: string | null;
  last_message: { sender: string; body: string; timestamp: number } | null;
}

interface MatrixEvent {
  event_id: string;
  type: string;
  sender: string;
  origin_server_ts: number;
  deleted?: boolean;
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

interface FixtureNotice {
  id: string;
  room_id: string;
  fixture_number: string;
  title: string;
  vessel_name?: string | null;
  cargo_description?: string | null;
  load_port?: string | null;
  discharge_port?: string | null;
  source_type?: string;
  confidence?: number | null;
}

interface RoomFixtureSummary {
  id: string;
  room_id: string;
  fixture_number: string;
  title: string;
  vessel_name?: string | null;
  cargo_description?: string | null;
  load_port?: string | null;
  discharge_port?: string | null;
  stage?: string;
  status?: string;
}

interface PeerContactPayload {
  userId: string;
  displayName: string;
  matrixDisplayName?: string | null;
  avatarUrl?: string | null;
  email: string;
  phone: string;
  companyName?: string | null;
  jobTitle?: string | null;
  timezone?: string | null;
  location: {
    label?: string | null;
    city?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
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

/** Recipient avatar for 1:1 chats (Matrix MXC → proxied media URL). */
function dmRoomAvatarSrc(room: WsRoom): string | null {
  if (room.member_count !== 2) return null;
  return mxcToMediaPath(room.avatar_url);
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

/**
 * Preferred label above a chat bubble:
 * 1. Matrix display_name from the room's member map (real profile name)
 * 2. For 2-person DMs: the room title (already the peer's name)
 * 3. Fallback: prettified localpart (same as senderDisplayName)
 */
function resolveSenderLabel(
  sender: string,
  room: WsRoom,
  memberMap: Record<string, string> | undefined,
): string {
  const mapped = memberMap?.[sender];
  if (mapped?.trim()) return mapped.trim();
  if (room.member_count === 2 && room.name?.trim()) return room.name.trim();
  return senderDisplayName(sender);
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

/** Renders chat body; linkifies lines that are http(s) URLs (e.g. file attachments). */
function renderMessageBodyLines(body: string, linkClassName: string) {
  const lines = body.split("\n");
  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 ? <br /> : null}
      {/^https?:\/\//.test(line.trim()) ? (
        <a
          href={line.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("break-all underline", linkClassName)}
        >
          {line}
        </a>
      ) : (
        line
      )}
    </span>
  ));
}

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "mkv", "avi", "m4v"]);

function fileExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i < 0) return "";
  return filename.slice(i + 1).toLowerCase();
}

function splashFileMediaKind(
  filename: string,
): "image" | "video" | "file" {
  const ext = fileExtension(filename);
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  return "file";
}

/**
 * Quint file messages are sent as `📎 filename\n<download url>`.
 */
function parseSplashFileAttachment(
  body: string,
): { filename: string; url: string } | null {
  const m = body.match(
    /^📎\s+(.+)\n(https?:\/\/\S+)\s*$/,
  );
  if (!m) return null;
  return { filename: m[1].trim(), url: m[2].trim() };
}

/** Sidebar / list preview: show filename instead of raw URL for file messages. */
function previewTextForMessageBody(body: string): string {
  const att = parseSplashFileAttachment(body);
  if (att) return `📎 ${att.filename}`;
  return body;
}

function FileTypeIcon({
  filename,
  className,
}: {
  filename: string;
  className?: string;
}) {
  const ext = fileExtension(filename);
  if (["pdf", "doc", "docx", "txt", "md", "rtf"].includes(ext)) {
    return <FileText className={className} />;
  }
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
    return <FileArchive className={className} />;
  }
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext)) {
    return <Music className={className} />;
  }
  return <File className={className} />;
}

function renderChatMessageContent(body: string, isMe: boolean) {
  const att = parseSplashFileAttachment(body);
  const linkMuted = isMe ? "text-blue-100" : "text-blue-600";

  if (att) {
    const kind = splashFileMediaKind(att.filename);
    if (kind === "image") {
      return (
        <a
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block outline-none"
        >
          <img
            src={att.url}
            alt={att.filename}
            className="max-h-48 max-w-full rounded object-contain"
          />
        </a>
      );
    }
    if (kind === "video") {
      return (
        <a
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded outline-none"
        >
          <video
            src={att.url}
            muted
            playsInline
            preload="metadata"
            className="max-h-48 max-w-full object-contain"
          />
        </a>
      );
    }
    return (
      <a
        href={att.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-opacity hover:opacity-90",
          isMe
            ? "border-blue-400/50 bg-blue-600/30"
            : "border-slate-200 bg-slate-50",
        )}
      >
        <FileTypeIcon
          filename={att.filename}
          className={cn(
            "h-5 w-5 shrink-0",
            isMe ? "text-blue-100" : "text-blue-600",
          )}
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[14px]",
            isMe ? "text-white" : "text-slate-900",
          )}
        >
          {att.filename}
        </span>
      </a>
    );
  }

  return (
    <p className="whitespace-pre-wrap">
      {renderMessageBodyLines(body, linkMuted)}
    </p>
  );
}

/* ── component ── */

export default function ChatPage() {
  const { matrixUserId } = useAuthStore();
  const router = useRouter();

  const [rooms, setRooms] = useState<WsRoom[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<WsRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);

  const [showNewRoom, setShowNewRoom] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [messageStatuses, setMessageStatuses] = useState<Record<string, MessageStatus>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  /** roomId → (userId → Matrix display_name). Used for sender labels in bubbles. */
  const [memberNameMap, setMemberNameMap] = useState<
    Record<string, Record<string, string>>
  >({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Per-(room, user) safety timeouts that auto-clear the typing indicator
  // if we miss a stop_typing event. Keyed by `${room_id}::${user_id}`.
  const typingExpiryRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const selectedRoomRef = useRef(selectedRoom);
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  useEffect(() => {
    if (selectedRoom && selectedRoom.member_count <= 2 && editingName) {
      setEditingName(false);
      setNameInput("");
    }
  }, [selectedRoom?.room_id, selectedRoom?.member_count, editingName]);

  /* Load member display names for the selected room so sender labels
     ("display name" above chat bubbles) show real names, not matrix localparts. */
  useEffect(() => {
    if (!selectedRoom) return;
    const roomId = selectedRoom.room_id;
    if (memberNameMap[roomId]) return;
    let cancelled = false;
    quintApi
      .get<{ members: { user_id: string; display_name: string | null }[] }>(
        `/v1/rooms/${encodeURIComponent(roomId)}/members`,
      )
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const m of res.members ?? []) {
          if (m.display_name?.trim()) {
            map[m.user_id] = m.display_name.trim();
          }
        }
        setMemberNameMap((prev) => ({ ...prev, [roomId]: map }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedRoom?.room_id, memberNameMap]);

  const matrixUserIdRef = useRef(matrixUserId);
  useEffect(() => { matrixUserIdRef.current = matrixUserId; }, [matrixUserId]);

  const bottomRef = useRef<HTMLDivElement>(null);

  /* WebSocket — all data comes via push events */
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;
    if (!token) return;

    const sock = getSocket(token);
    socketRef.current = sock;

    const onInit = (data: { rooms: WsRoom[] }) => {
      setRooms(data.rooms);
      setRoomsLoaded(true);
    };

    const onRoomsUpdate = (data: { rooms: WsRoom[] }) => {
      setRooms(data.rooms);
    };

    const onNewMessage = (data: { event_id: string; room_id: string; sender: string; body: string; timestamp: number }) => {
      if (data.room_id === selectedRoomRef.current?.room_id) {
        const uid = matrixUserIdRef.current;
        const cutoff = getChatClearCutoff(uid, data.room_id);
        if (cutoff != null && data.timestamp <= cutoff) {
          return;
        }
        const newMsg: MatrixEvent = {
          event_id: data.event_id,
          type: "m.room.message",
          sender: data.sender,
          origin_server_ts: data.timestamp,
          content: { body: data.body, msgtype: "m.text" },
        };
        setMessages(prev => {
          if (prev.some(m => m.event_id === data.event_id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    const clearTypingExpiry = (key: string) => {
      const timers = typingExpiryRef.current;
      if (timers[key]) {
        clearTimeout(timers[key]);
        delete timers[key];
      }
    };

    const setTypingExpiry = (room_id: string, user_id: string) => {
      const key = `${room_id}::${user_id}`;
      clearTypingExpiry(key);
      typingExpiryRef.current[key] = setTimeout(() => {
        setTypingUsers(prev => {
          const current = prev[room_id] || [];
          if (!current.includes(user_id)) return prev;
          return { ...prev, [room_id]: current.filter(u => u !== user_id) };
        });
        delete typingExpiryRef.current[key];
      }, 6000); // auto-clear 6s after last typing event
    };

    const onTyping = (data: { user_id: string; room_id: string }) => {
      if (data.user_id === matrixUserIdRef.current) return;
      setTypingUsers(prev => {
        const current = prev[data.room_id] || [];
        if (current.includes(data.user_id)) return prev;
        return { ...prev, [data.room_id]: [...current, data.user_id] };
      });
      setTypingExpiry(data.room_id, data.user_id);
    };

    const onStopTyping = (data: { user_id: string; room_id: string }) => {
      clearTypingExpiry(`${data.room_id}::${data.user_id}`);
      setTypingUsers(prev => {
        const current = prev[data.room_id] || [];
        return { ...prev, [data.room_id]: current.filter(u => u !== data.user_id) };
      });
    };

    const onDelivered = (data: { event_id: string }) => {
      setMessageStatuses(prev => ({
        ...prev,
        [data.event_id]: prev[data.event_id] === "read" ? "read" : "delivered",
      }));
    };

    const onRead = (data: { event_id: string }) => {
      setMessageStatuses(prev => ({ ...prev, [data.event_id]: "read" }));
    };

    const onRoomDeleted = (data: { room_id: string }) => {
      setSelectedRoom((prev) =>
        prev?.room_id === data.room_id ? null : prev,
      );
    };

    const onFixtureCreated = (fx: FixtureNotice) => {
      setFixtureNotices((prev) => {
        const next = { ...prev, [fx.room_id]: fx };
        return next;
      });
      setRoomFixtures((prev) => ({
        ...prev,
        [fx.room_id]: {
          id: fx.id,
          room_id: fx.room_id,
          fixture_number: fx.fixture_number,
          title: fx.title,
          vessel_name: fx.vessel_name,
          cargo_description: fx.cargo_description,
          load_port: fx.load_port,
          discharge_port: fx.discharge_port,
        },
      }));
    };

    const onMessageDeleted = (data: { event_id: string; room_id: string; sender?: string }) => {
      setMessages((prev) => {
        const myId = matrixUserIdRef.current;
        return prev.flatMap((m) => {
          if (m.event_id !== data.event_id) return [m];
          if (data.sender === myId || m.sender === myId) return [];
          return [{ ...m, deleted: true, content: { ...m.content, body: "" } }];
        });
      });
    };

    sock.on("init", onInit);
    sock.on("rooms_update", onRoomsUpdate);
    sock.on("new_message", onNewMessage);
    sock.on("typing", onTyping);
    sock.on("stop_typing", onStopTyping);
    sock.on("delivered", onDelivered);
    sock.on("read", onRead);
    sock.on("room_deleted", onRoomDeleted);
    sock.on("fixture_created", onFixtureCreated);
    sock.on("message_deleted", onMessageDeleted);

    // Request init in case we missed the event (layout connected before us)
    if (sock.connected) {
      sock.emit("request_init");
    } else {
      sock.once("connect", () => sock.emit("request_init"));
    }

    return () => {
      sock.off("init", onInit);
      sock.off("rooms_update", onRoomsUpdate);
      sock.off("new_message", onNewMessage);
      sock.off("typing", onTyping);
      sock.off("stop_typing", onStopTyping);
      sock.off("delivered", onDelivered);
      sock.off("read", onRead);
      sock.off("room_deleted", onRoomDeleted);
      sock.off("fixture_created", onFixtureCreated);
      sock.off("message_deleted", onMessageDeleted);
      // Clear any lingering typing-expiry timers.
      Object.values(typingExpiryRef.current).forEach(clearTimeout);
      typingExpiryRef.current = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fetch active fixtures for all rooms so we can show the indicator */
  useEffect(() => {
    if (!roomsLoaded || rooms.length === 0) return;
    const ids = rooms.map((r) => r.room_id);
    quintApi
      .post<{ fixtures: Record<string, RoomFixtureSummary> }>(
        "/v1/fixtures/by-rooms",
        { room_ids: ids },
      )
      .then((res) => setRoomFixtures(res.fixtures ?? {}))
      .catch(() => {});
  }, [roomsLoaded, rooms]);

  /* Mark messages read when viewing a room */
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock?.connected || !selectedRoom || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    sock.emit("mark_read", { room_id: selectedRoom.room_id, event_id: lastMsg.event_id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.room_id, messages.length]);

  /* fetch messages for selected room (one-time on room select) */
  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await quintApi.get<MessagesResponse>(
        `/v1/messages/get?room_id=${encodeURIComponent(roomId)}&limit=50`,
      );
      const msgs = res.messages ?? res.chunk ?? [];
      const textMsgs = msgs
        .filter((e) => e.type === "m.room.message")
        .flatMap((e) => {
          if (!e.content?.body) {
            if (e.sender === matrixUserId) return [];
            return [{ ...e, deleted: true, content: { ...e.content, body: "" } }];
          }
          return [e];
        });
      textMsgs.sort((a, b) => a.origin_server_ts - b.origin_server_ts);
      const cutoff = getChatClearCutoff(matrixUserId, roomId);
      setMessages(filterMessagesAfterClear(textMsgs, cutoff));
    } catch {
      setMessages([]);
    }
  }, [matrixUserId]);

  const sendRoomTextMessage = useCallback(
    async (roomId: string, body: string) => {
      const txnId = `m${Date.now()}`;
      const sock = socketRef.current;
      if (sock?.connected) {
        sock.emit("send_message", {
          room_id: roomId,
          body,
          txn_id: txnId,
        });
      } else {
        await sendMatrixRoomTextMessage(roomId, body);
        await fetchMessages(roomId);
      }
    },
    [fetchMessages],
  );

  useEffect(() => {
    if (!selectedRoom) return;
    setFileUploadError(null);
    setMsgsLoading(true);
    fetchMessages(selectedRoom.room_id).finally(() => setMsgsLoading(false));
  }, [selectedRoom, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedRoom?.room_id]);

  /* send message */
  const handleSend = async () => {
    if (!draft.trim() || !selectedRoom || !matrixUserId) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");

    try {
      await sendRoomTextMessage(selectedRoom.room_id, body);
    } catch (err) {
      console.error("[WS] send failed:", err);
    } finally {
      setSending(false);
    }
  };

  /* Conversation-header menu actions */
  const [confirmDelete, setConfirmDelete] = useState<WsRoom | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [messageMenuEventId, setMessageMenuEventId] = useState<string | null>(
    null,
  );
  const [confirmDeleteMessage, setConfirmDeleteMessage] =
    useState<MatrixEvent | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [messageActionError, setMessageActionError] = useState<string | null>(
    null,
  );
  const [fixtureNotices, setFixtureNotices] = useState<
    Record<string, FixtureNotice>
  >({});
  const [roomFixtures, setRoomFixtures] = useState<
    Record<string, RoomFixtureSummary>
  >({});
  const [updatingFixture, setUpdatingFixture] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [peerContact, setPeerContact] = useState<PeerContactPayload | null>(null);
  const [peerContactLoading, setPeerContactLoading] = useState(false);
  const [peerContactError, setPeerContactError] = useState<string | null>(null);
  const [groupMembersList, setGroupMembersList] = useState<
    { user_id: string; display_name: string | null }[]
  >([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatQuery, setInChatQuery] = useState("");
  const [mutedRooms, setMutedRooms] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("muted-rooms") || "{}");
    } catch {
      return {};
    }
  });

  const isSelectedMuted = !!(
    selectedRoom && mutedRooms[selectedRoom.room_id]
  );

  useEffect(() => {
    if (!showContactInfo || !selectedRoom) return;
    const roomId = selectedRoom.room_id;
    if (selectedRoom.member_count > 2) {
      setPeerContact(null);
      setPeerContactError(null);
      setGroupMembersLoading(true);
      setGroupMembersList([]);
      quintApi
        .get<{ members: { user_id: string; display_name: string | null }[] }>(
          `/v1/rooms/${encodeURIComponent(roomId)}/members`,
        )
        .then((res) => setGroupMembersList(res.members ?? []))
        .catch(() => setGroupMembersList([]))
        .finally(() => setGroupMembersLoading(false));
      return;
    }
    setPeerContactLoading(true);
    setPeerContactError(null);
    setPeerContact(null);
    setGroupMembersList([]);
    quintApi
      .get<{ peer: PeerContactPayload }>(
        `/v1/rooms/${encodeURIComponent(roomId)}/peer-contact`,
      )
      .then((res) => setPeerContact(res.peer))
      .catch((e) =>
        setPeerContactError(
          e instanceof Error ? e.message : "Could not load contact",
        ),
      )
      .finally(() => setPeerContactLoading(false));
  }, [showContactInfo, selectedRoom?.room_id, selectedRoom?.member_count]);

  const toggleMuteSelected = () => {
    if (!selectedRoom) return;
    setMutedRooms((prev) => {
      const next = { ...prev, [selectedRoom.room_id]: !prev[selectedRoom.room_id] };
      if (!next[selectedRoom.room_id]) delete next[selectedRoom.room_id];
      if (typeof window !== "undefined") {
        localStorage.setItem("muted-rooms", JSON.stringify(next));
      }
      return next;
    });
  };

  const clearSelectedChat = () => {
    if (!selectedRoom || !matrixUserId) {
      setMessages([]);
      return;
    }
    const cutoff =
      messages.length > 0
        ? Math.max(...messages.map((m) => m.origin_server_ts))
        : Date.now();
    setChatClearCutoff(matrixUserId, selectedRoom.room_id, cutoff);
    setMessages([]);
  };

  const closeSelectedChat = () => {
    setSelectedRoom(null);
    setShowInChatSearch(false);
    setInChatQuery("");
  };

  const handleDeleteRoom = () => {
    if (!confirmDelete) return;
    const sock = socketRef.current;
    const roomId = confirmDelete.room_id;
    setDeleting(true);
    if (sock?.connected) {
      sock.emit("delete_room", { room_id: roomId });
      // Optimistically remove
      setRooms((prev) => prev.filter((r) => r.room_id !== roomId));
      if (selectedRoom?.room_id === roomId) setSelectedRoom(null);
    }
    setDeleting(false);
    setConfirmDelete(null);
  };

  const handleCopyMessage = (msg: MatrixEvent) => {
    const text = msg.content.body ?? "";
    void navigator.clipboard.writeText(text).catch(() => {
      setMessageActionError("Could not copy to clipboard");
    });
  };

  const handleReplyToMessage = (msg: MatrixEvent) => {
    const body = msg.content.body ?? "";
    const quoted = body
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    setDraft((prev) => (prev.trim() ? `${quoted}\n\n${prev}` : `${quoted}\n\n`));
    requestAnimationFrame(() => draftInputRef.current?.focus());
  };

  const handleConfirmDeleteMessage = async () => {
    if (!confirmDeleteMessage || !selectedRoom) return;
    setDeletingMessage(true);
    setMessageActionError(null);
    try {
      await quintApi.post("/v1/messages/actions/redact", {
        roomId: selectedRoom.room_id,
        eventId: confirmDeleteMessage.event_id,
      });
      setMessages((prev) =>
        prev.filter((m) => m.event_id !== confirmDeleteMessage.event_id),
      );
      setConfirmDeleteMessage(null);
    } catch (e) {
      setMessageActionError(
        e instanceof Error ? e.message : "Could not delete message",
      );
    } finally {
      setDeletingMessage(false);
    }
  };

  /* typing indicator emission */
  const handleDraftChange = (value: string) => {
    setDraft(value);
    const sock = socketRef.current;
    if (!sock?.connected || !selectedRoom) return;
    sock.emit("typing", { room_id: selectedRoom.room_id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sock.emit("stop_typing", { room_id: selectedRoom.room_id });
    }, 3000);
  };

  /* file upload → Quint storage, then Matrix text message with download link */
  const handleFileUpload = () => {
    if (!selectedRoom || !matrixUserId || uploadingFile) return;
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const roomId = selectedRoomRef.current?.room_id;
      const senderId = matrixUserIdRef.current;
      if (!roomId || !senderId) return;
      setUploadingFile(true);
      setFileUploadError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("roomId", roomId);
        fd.append("senderId", senderId);
        const res = await quintApi.postFormData<{
          fileId?: string;
          filename?: string;
        }>("/v1/files/upload", fd);
        const fileId = res.fileId;
        const filename = res.filename ?? file.name;
        if (!fileId) {
          throw new Error("Upload did not return a file id");
        }
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const downloadUrl = `${origin}/quint-api/v1/files/${encodeURIComponent(fileId)}`;
        const body = `📎 ${filename}\n${downloadUrl}`;
        await sendRoomTextMessage(roomId, body);
      } catch (e) {
        console.error("file upload / send failed:", e);
        setFileUploadError(
          e instanceof Error ? e.message : "Could not send file",
        );
      } finally {
        setUploadingFile(false);
      }
    };
    input.click();
  };

  const handleRoomCreated = (roomId: string, name: string) => {
    const existing = rooms.find((r) => r.room_id === roomId);
    if (existing) {
      setSelectedRoom(existing);
      setShowNewRoom(false);
      return;
    }
    const newRoom: WsRoom = {
      room_id: roomId,
      name,
      member_count: 2,
      is_direct: true,
      last_message: null,
    };
    setRooms((prev) => [newRoom, ...prev]);
    setSelectedRoom(newRoom);
    setShowNewRoom(false);
  };

  const startRename = () => {
    if (!selectedRoom || selectedRoom.member_count <= 2) return;
    setNameInput(selectedRoom?.name || "");
    setEditingName(true);
  };

  const cancelRename = () => {
    setEditingName(false);
    setNameInput("");
  };

  const saveRename = async () => {
    if (!selectedRoom || !nameInput.trim()) return;
    setSavingName(true);
    try {
      await quintApi.put(
        `/v1/rooms/${encodeURIComponent(selectedRoom.room_id)}/name`,
        { name: nameInput.trim() },
      );
      const updated: WsRoom = { ...selectedRoom, name: nameInput.trim() };
      setSelectedRoom(updated);
      setRooms((prev) =>
        prev.map((r) => (r.room_id === updated.room_id ? updated : r)),
      );
      setEditingName(false);
    } catch {
      /* ignore */
    } finally {
      setSavingName(false);
    }
  };

  const filteredRooms = searchQuery.trim()
    ? rooms.filter((r) =>
        (r.name || r.room_id).toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : rooms;

  const selectedDmAvatarSrc = selectedRoom
    ? dmRoomAvatarSrc(selectedRoom)
    : null;

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
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {!roomsLoaded ? (
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
              const dmAvatarSrc = dmRoomAvatarSrc(room);
              const preview = room.last_message
                ? previewTextForMessageBody(room.last_message.body)
                : "";
              const ts = room.last_message
                ? formatTimestamp(room.last_message.timestamp)
                : "";

              const roomFx = roomFixtures[room.room_id];

              return (
                <button
                  key={room.room_id}
                  onClick={() => setSelectedRoom(room)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors border-b border-slate-100",
                    isActive ? "bg-slate-100" : "hover:bg-slate-50",
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      {dmAvatarSrc ? (
                        <AvatarImage src={dmAvatarSrc} alt="" />
                      ) : null}
                      <AvatarFallback
                        className={cn(
                          "flex items-center justify-center text-white",
                          color,
                        )}
                      >
                        <User className="h-6 w-6" strokeWidth={2} />
                      </AvatarFallback>
                    </Avatar>
                    {roomFx && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/fixtures/${roomFx.id}`);
                        }}
                        title={`${roomFx.fixture_number}: ${roomFx.title}`}
                        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm ring-2 ring-white cursor-pointer hover:bg-blue-700 transition-colors"
                      >
                        <Anchor className="h-3 w-3" />
                      </span>
                    )}
                  </div>
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
                {selectedDmAvatarSrc ? (
                  <AvatarImage src={selectedDmAvatarSrc} alt="" />
                ) : null}
                <AvatarFallback
                  className={cn(
                    "flex items-center justify-center text-white",
                    roomColor(selectedRoom.room_id),
                  )}
                >
                  <User className="h-5 w-5" strokeWidth={2} />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      disabled={savingName}
                      autoFocus
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    />
                    <button
                      onClick={saveRename}
                      disabled={savingName || !nameInput.trim()}
                      className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
                    >
                      {savingName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={cancelRename}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[15px] font-semibold text-slate-900 truncate">
                    {selectedRoom.name || selectedRoom.room_id}
                  </p>
                )}
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setShowContactInfo(true)}
                    className="text-left font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                  >
                    {selectedRoom.member_count > 2
                      ? "Click here for group info"
                      : "Click here for contact info"}
                  </button>
                  {isSelectedMuted && (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <BellOff className="h-3 w-3" /> Muted
                    </span>
                  )}
                </p>
              </div>
              {roomFixtures[selectedRoom.room_id] && (
                <button
                  type="button"
                  onClick={() => router.push(`/fixtures/${roomFixtures[selectedRoom.room_id].id}`)}
                  title={`Open ${roomFixtures[selectedRoom.room_id].fixture_number}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <Anchor className="h-3.5 w-3.5" />
                  {roomFixtures[selectedRoom.room_id].fixture_number}
                </button>
              )}
              {roomFixtures[selectedRoom.room_id] && (
                <button
                  type="button"
                  disabled={updatingFixture}
                  onClick={async () => {
                    const fx = roomFixtures[selectedRoom.room_id];
                    if (!fx) return;
                    setUpdatingFixture(true);
                    try {
                      const res = await quintApi.post<{
                        changes_count?: number;
                        summary?: { terms_added?: number; terms_updated?: number; issues_added?: number };
                      }>(`/v1/fixtures/${fx.id}/update`);
                      const c = res.changes_count ?? 0;
                      const s = res.summary;
                      const parts: string[] = [];
                      if (s?.terms_added) parts.push(`${s.terms_added} term(s) added`);
                      if (s?.terms_updated) parts.push(`${s.terms_updated} term(s) updated`);
                      if (s?.issues_added) parts.push(`${s.issues_added} issue(s) found`);
                      alert(
                        c > 0
                          ? `Fixture updated: ${parts.join(", ")}`
                          : "Fixture is up to date — no new changes detected.",
                      );
                    } catch (err) {
                      alert(
                        err instanceof Error
                          ? `Update failed: ${err.message}`
                          : "Could not update fixture",
                      );
                    } finally {
                      setUpdatingFixture(false);
                    }
                  }}
                  title="Re-analyze chat to update fixture terms, issues, and documents"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", updatingFixture && "animate-spin")} />
                  Update Fixture
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    title="Chat options"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setShowContactInfo(true)}
                    className="cursor-pointer"
                  >
                    <Info className="mr-2 h-4 w-4" />
                    {selectedRoom.member_count > 2 ? "Group Info" : "Contact Info"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowInChatSearch(true)}
                    className="cursor-pointer"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={toggleMuteSelected}
                    className="cursor-pointer"
                  >
                    {isSelectedMuted ? (
                      <Bell className="mr-2 h-4 w-4" />
                    ) : (
                      <BellOff className="mr-2 h-4 w-4" />
                    )}
                    {isSelectedMuted ? "Unmute Notifications" : "Mute Notifications"}
                  </DropdownMenuItem>
                  {selectedRoom.member_count > 2 && (
                    <DropdownMenuItem
                      onClick={startRename}
                      className="cursor-pointer"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename Chat
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={clearSelectedChat}
                    className="cursor-pointer"
                  >
                    <Eraser className="mr-2 h-4 w-4" />
                    Clear Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={closeSelectedChat}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Close Chat
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmDelete(selectedRoom)}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* In-chat search bar */}
            {showInChatSearch && (
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in this chat..."
                    value={inChatQuery}
                    onChange={(e) => setInChatQuery(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-10 pr-10 text-sm outline-none focus:border-blue-300"
                  />
                  <button
                    onClick={() => {
                      setShowInChatSearch(false);
                      setInChatQuery("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* AI-detected fixture banner (per-room, transient) */}
            {fixtureNotices[selectedRoom.room_id] && (
              <FixtureDetectedBanner
                notice={fixtureNotices[selectedRoom.room_id]}
                onOpen={() =>
                  router.push(
                    `/fixtures/${fixtureNotices[selectedRoom.room_id].id}`,
                  )
                }
                onDismiss={() =>
                  setFixtureNotices((prev) => {
                    const next = { ...prev };
                    delete next[selectedRoom.room_id];
                    return next;
                  })
                }
              />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-4">
              {msgsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (() => {
                const visibleMessages =
                  showInChatSearch && inChatQuery.trim()
                    ? messages.filter((m) =>
                        (m.content.body ?? "")
                          .toLowerCase()
                          .includes(inChatQuery.trim().toLowerCase()),
                      )
                    : messages;
                if (visibleMessages.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/70">
                        <Smile className="h-9 w-9 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">
                        {showInChatSearch && inChatQuery.trim()
                          ? "No matching messages"
                          : "No messages yet"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {showInChatSearch && inChatQuery.trim()
                          ? "Try a different search term"
                          : "Send a message to start the conversation"}
                      </p>
                    </div>
                  );
                }
                return (
                <div className="space-y-1">
                  {visibleMessages.map((msg, idx) => {
                    const isMe = msg.sender === matrixUserId;
                    const prevMsg = visibleMessages[idx - 1];
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
                            "group/msg relative max-w-[65%] rounded-lg px-3 py-2 shadow-sm",
                            msg.deleted
                              ? "border border-slate-200 bg-slate-50"
                              : isMe
                                ? "bg-blue-500 text-white"
                                : "bg-white text-slate-900",
                          )}
                        >
                          {!msg.deleted && (
                          <DropdownMenu
                            open={messageMenuEventId === msg.event_id}
                            onOpenChange={(open) =>
                              setMessageMenuEventId(open ? msg.event_id : null)
                            }
                          >
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="Message actions"
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  "absolute right-1.5 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-md transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                                  messageMenuEventId === msg.event_id
                                    ? "opacity-100"
                                    : "opacity-0 group-hover/msg:opacity-100",
                                  isMe
                                    ? "text-blue-100 hover:bg-blue-600/60 focus-visible:ring-blue-300 focus-visible:ring-offset-blue-500"
                                    : "text-slate-500 hover:bg-slate-100 focus-visible:ring-slate-300 focus-visible:ring-offset-white",
                                )}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align={isMe ? "end" : "start"}
                              className="w-40"
                            >
                              <DropdownMenuItem
                                onSelect={() => handleCopyMessage(msg)}
                              >
                                Copy
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleReplyToMessage(msg)}
                              >
                                Reply
                              </DropdownMenuItem>
                              {isMe && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onSelect={() => {
                                      setMessageActionError(null);
                                      setConfirmDeleteMessage(msg);
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          )}
                          {showSender && !msg.deleted && (
                            <p className="mb-0.5 text-xs font-semibold text-blue-500">
                              {resolveSenderLabel(
                                msg.sender,
                                selectedRoom,
                                memberNameMap[selectedRoom.room_id],
                              )}
                            </p>
                          )}
                          {msg.deleted ? (
                            <div className="py-0.5 pr-12 pb-[15px]">
                              <span className="text-[13px] italic text-slate-400">
                                (Deleted)
                              </span>
                            </div>
                          ) : (
                          <div className="text-[14px] leading-relaxed pr-12 pb-[15px]">
                            {renderChatMessageContent(
                              msg.content.body ?? "",
                              isMe,
                            )}
                          </div>
                          )}
                          <span
                            className={cn(
                              "absolute bottom-1.5 right-2.5 flex items-center gap-1 text-[10px] leading-none",
                              isMe ? "text-blue-200" : "text-slate-400",
                            )}
                          >
                            {formatMsgTime(msg.origin_server_ts)}
                            {isMe && (
                              <span className="ml-1 inline-flex">
                                {(() => {
                                  const status = messageStatuses[msg.event_id] || "delivered";
                                  if (status === "read") {
                                    return (
                                      <svg
                                        className="h-3.5 w-3.5 text-green-300"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-label="Read"
                                      >
                                        <path d="M1 12l5 5L17 6" />
                                        <path d="M7 12l5 5L23 6" />
                                      </svg>
                                    );
                                  }
                                  if (status === "delivered") {
                                    return (
                                      <svg
                                        className="h-3.5 w-3.5 text-blue-200"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-label="Delivered"
                                      >
                                        <path d="M1 12l5 5L17 6" />
                                        <path d="M7 12l5 5L23 6" />
                                      </svg>
                                    );
                                  }
                                  if (status === "sent") {
                                    return (
                                      <svg
                                        className="h-3.5 w-3.5 text-blue-200"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-label="Sent"
                                      >
                                        <path d="M4 12l5 5L20 6" />
                                      </svg>
                                    );
                                  }
                                  return null;
                                })()}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                );
              })()}
            </div>

            {/* Typing indicator */}
            {selectedRoom && (typingUsers[selectedRoom.room_id]?.length ?? 0) > 0 && (
              <div className="px-6 py-2 text-xs text-slate-400 flex items-center gap-2">
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
                <span>
                  {typingUsers[selectedRoom.room_id]
                    .map(u => {
                      const nameMap = memberNameMap[selectedRoom.room_id];
                      if (nameMap?.[u]?.trim()) return nameMap[u].trim();
                      const local = u.replace(/^@/, "").split(":")[0];
                      return local.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                    })
                    .join(", ")}{" "}
                  {typingUsers[selectedRoom.room_id].length === 1 ? "is" : "are"} typing
                </span>
              </div>
            )}

            {/* Compose bar */}
            <div className="border-t border-slate-200 bg-white px-4 py-3">
              {messageActionError && (
                <p className="mb-2 text-center text-xs text-red-600">
                  {messageActionError}
                </p>
              )}
              {fileUploadError && (
                <p className="mb-2 text-center text-xs text-red-600">
                  {fileUploadError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={uploadingFile || sending}
                  title="Attach file"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                >
                  {uploadingFile ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </button>
                <input
                  ref={draftInputRef}
                  type="text"
                  placeholder="Type a message"
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending || uploadingFile}
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-300 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || uploadingFile || !draft.trim()}
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

      {/* Contact / Group info dialog */}
      <Dialog open={showContactInfo} onOpenChange={setShowContactInfo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRoom && selectedRoom.member_count > 2
                ? "Group info"
                : "Contact info"}
            </DialogTitle>
          </DialogHeader>
          {selectedRoom && selectedRoom.member_count > 2 ? (
            <div className="space-y-4 pt-2">
              {groupMembersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    {selectedRoom.name || "Group chat"} ·{" "}
                    {selectedRoom.member_count} members
                  </p>
                  <ul className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {groupMembersList.map((m) => (
                      <li
                        key={m.user_id}
                        className="flex items-center gap-3 text-sm text-slate-800"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            className={cn(
                              "flex items-center justify-center text-white",
                              roomColor(m.user_id),
                            )}
                          >
                            <User className="h-4 w-4" strokeWidth={2} />
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="font-medium">
                            {memberListLabel(m.user_id, m.display_name)}
                          </span>
                          {m.user_id === matrixUserId && (
                            <span className="ml-2 text-xs text-slate-400">
                              (you)
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <InfoRow
                    label="Notifications"
                    value={isSelectedMuted ? "Muted" : "On"}
                  />
                </>
              )}
            </div>
          ) : (
            selectedRoom && (
              <div className="space-y-4 pt-2">
                {peerContactLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : peerContactError ? (
                  <p className="text-center text-sm text-red-600">
                    {peerContactError}
                  </p>
                ) : peerContact ? (
                  <>
                    <div className="flex flex-col items-center gap-3 py-2">
                      <Avatar className="h-24 w-24 border border-slate-200">
                        {mxcToMediaPath(peerContact.avatarUrl) ? (
                          <AvatarImage
                            src={mxcToMediaPath(peerContact.avatarUrl)!}
                            alt=""
                          />
                        ) : null}
                        <AvatarFallback
                          className={cn(
                            "flex items-center justify-center text-white",
                            roomColor(peerContact.userId),
                          )}
                        >
                          <User className="h-12 w-12" strokeWidth={1.75} />
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-slate-900">
                          {peerContact.displayName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {peerContact.userId}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <InfoRow
                        label="Email"
                        value={
                          peerContact.email?.trim()
                            ? peerContact.email
                            : "—"
                        }
                      />
                      <InfoRow
                        label="Phone"
                        value={
                          peerContact.phone?.trim()
                            ? formatPhoneDisplay(peerContact.phone) ||
                              peerContact.phone
                            : "—"
                        }
                      />
                      <InfoRow
                        label="Company"
                        value={
                          peerContact.companyName?.trim()
                            ? peerContact.companyName
                            : "—"
                        }
                      />
                      <InfoRow
                        label="Job title"
                        value={
                          peerContact.jobTitle?.trim()
                            ? peerContact.jobTitle
                            : "—"
                        }
                      />
                      <InfoRow
                        label="Timezone"
                        value={
                          peerContact.timezone?.trim()
                            ? peerContact.timezone
                            : "—"
                        }
                      />
                      <InfoRow
                        label="Location"
                        value={
                          peerContact.location?.label?.trim()
                            ? peerContact.location.label
                            : "—"
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Delete chat confirmation */}
      {confirmDeleteMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-slate-900">
                  Delete this message?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  This removes the message for everyone in the chat. You cannot
                  undo this.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteMessage(null);
                  setMessageActionError(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                disabled={deletingMessage}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMessage}
                disabled={deletingMessage}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-slate-900">
                  Delete chat?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  You will leave{" "}
                  <span className="font-medium text-slate-700">
                    {confirmDelete.name || "this chat"}
                  </span>{" "}
                  and stop receiving messages. Other members will stay.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function memberListLabel(userId: string, displayName: string | null): string {
  if (displayName?.trim()) return displayName.trim();
  return userId.replace(/^@/, "").split(":")[0];
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs font-medium text-slate-400">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 truncate text-right text-slate-700",
          mono && "font-mono text-[11px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function FixtureDetectedBanner({
  notice,
  onOpen,
  onDismiss,
}: {
  notice: FixtureNotice;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const route =
    notice.load_port || notice.discharge_port
      ? `${notice.load_port ?? "?"} \u2192 ${notice.discharge_port ?? "?"}`
      : null;
  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
        <Sparkles className="h-4 w-4 text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-slate-900">
            AI opened a draft fixture
          </p>
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
            {notice.fixture_number}
          </span>
          {typeof notice.confidence === "number" && (
            <span className="text-[11px] text-slate-400">
              {Math.round(notice.confidence * 100)}% confidence
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-slate-600">
          {notice.title}
          {notice.cargo_description ? ` \u2013 ${notice.cargo_description}` : ""}
          {route ? ` \u2013 ${route}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Anchor className="h-3.5 w-3.5" />
          Open
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

