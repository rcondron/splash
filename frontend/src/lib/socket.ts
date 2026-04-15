"use client";

/**
 * Socket.IO is disabled while the frontend is connected to the remote Quint
 * API, which does not expose a WebSocket endpoint. These stubs prevent import
 * errors in any code that still references the socket module.
 */

export function getSocket(): null {
  return null;
}

export function connectSocket(): void {
  /* no-op */
}

export function disconnectSocket(): void {
  /* no-op */
}

export const socket = null;
