"use client";

import { useCallback } from "react";
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

/**
 * Stub — Socket.IO is disabled while using the remote Quint API.
 * Keeps the interface so existing call-sites don't break.
 */
export function useSocket(): UseSocketReturn {
  const noop = useCallback(() => {}, []);
  const noopUnsub = useCallback((_cb: unknown) => () => {}, []);

  return {
    isConnected: false,
    joinVoyage: noop as (voyageId: string) => void,
    leaveVoyage: noop as (voyageId: string) => void,
    sendMessage: noop as (conversationId: string, content: string) => void,
    onNewMessage: noopUnsub as (callback: (message: Message) => void) => () => void,
    onTyping: noopUnsub as (
      callback: (data: { userId: string; conversationId: string }) => void,
    ) => () => void,
    emitTyping: noop as (conversationId: string) => void,
  };
}
