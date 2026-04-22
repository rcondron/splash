import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const host = process.env.NEXT_PUBLIC_QUINT_HOST || "http://localhost:8888";
  console.log("[WS] connecting to:", host);
  return host;
}

export function getSocket(token?: string): Socket {
  // Return existing socket if it exists (connected OR still connecting)
  if (socket) return socket;

  if (!token) {
    throw new Error("getSocket called without token and no existing socket");
  }

  socket = io(getWsUrl(), {
    path: "/ws/socket.io",
    auth: { token },
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 20,
  });

  socket.on("connect", () => {
    console.log("[WS] connected", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[WS] disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.warn("[WS] connect error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
