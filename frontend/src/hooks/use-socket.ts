"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket, connectSocket } from "@/lib/socket";
import type { Message } from "@/types";

interface UseSocketReturn {
  isConnected: boolean;
  joinVoyage: (voyageId: string) => void;
  leaveVoyage: (voyageId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  onNewMessage: (callback: (message: Message) => void) => () => void;
  onTyping: (
    callback: (data: { userId: string; conversationId: string }) => void,
  ) => () => void;
  emitTyping: (conversationId: string) => void;
}

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    connectSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Set initial state
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  const joinVoyage = useCallback((voyageId: string) => {
    const socket = socketRef.current;
    if (socket.connected) {
      socket.emit("join:voyage", { voyageId });
    }
  }, []);

  const leaveVoyage = useCallback((voyageId: string) => {
    const socket = socketRef.current;
    if (socket.connected) {
      socket.emit("leave:voyage", { voyageId });
    }
  }, []);

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      const socket = socketRef.current;
      if (socket.connected) {
        socket.emit("message:send", { conversationId, content });
      }
    },
    [],
  );

  const onNewMessage = useCallback(
    (callback: (message: Message) => void): (() => void) => {
      const socket = socketRef.current;
      socket.on("message:new", callback);
      return () => {
        socket.off("message:new", callback);
      };
    },
    [],
  );

  const onTyping = useCallback(
    (
      callback: (data: { userId: string; conversationId: string }) => void,
    ): (() => void) => {
      const socket = socketRef.current;
      socket.on("typing", callback);
      return () => {
        socket.off("typing", callback);
      };
    },
    [],
  );

  const emitTyping = useCallback((conversationId: string) => {
    const socket = socketRef.current;
    if (socket.connected) {
      socket.emit("typing", { conversationId });
    }
  }, []);

  return {
    isConnected,
    joinVoyage,
    leaveVoyage,
    sendMessage,
    onNewMessage,
    onTyping,
    emitTyping,
  };
}
