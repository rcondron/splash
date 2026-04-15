"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { quintApi } from "@/lib/api";
import { isSpoofAuthToken } from "@/lib/spoof";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() =>
      setAuthHydrated(true),
    );
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!authHydrated) return;
    if (!isAuthenticated || !token) {
      router.replace("/auth/login");
    } else {
      setReady(true);
    }
  }, [authHydrated, isAuthenticated, token, router]);

  useEffect(() => {
    if (!ready || !token) return;
    if (isSpoofAuthToken(token)) {
      setUnreadCount(0);
      return;
    }
    quintApi
      .get<{ success: boolean; total: number }>("/v1/users/me/unread")
      .then((res) => setUnreadCount(res.total ?? 0))
      .catch(() => {});

    const interval = setInterval(() => {
      quintApi
        .get<{ success: boolean; total: number }>("/v1/users/me/unread")
        .then((res) => setUnreadCount(res.total ?? 0))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [ready, token]);

  if (!authHydrated || !ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar unreadCount={unreadCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
