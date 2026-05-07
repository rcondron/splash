"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { quintApi } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isChatPage = pathname === "/chat" || pathname.startsWith("/chat/");
  const { isAuthenticated, token, user, setUser } = useAuthStore();
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
    if (!ready) return;
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;
    if (!storedToken) return;

    const sock = getSocket(storedToken);

    const onInit = (data: { unread_count?: number }) => {
      setUnreadCount(data.unread_count ?? 0);
    };
    const onUnread = (data: { total?: number }) => {
      setUnreadCount(data.total ?? 0);
    };

    sock.on("init", onInit);
    sock.on("unread_count", onUnread);

    return () => {
      sock.off("init", onInit);
      sock.off("unread_count", onUnread);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    const uid = user.id;
    (async () => {
      try {
        const res = await quintApi.get<{
          avatarUrl?: string | null;
          firstName?: string;
          lastName?: string;
          phone?: string | null;
          email?: string | null;
        }>("/v1/profile/me");
        if (cancelled) return;
        const latest = useAuthStore.getState().user;
        if (!latest || latest.id !== uid) return;
        const updated = { ...latest };
        let changed = false;
        if ((res.avatarUrl ?? null) !== latest.avatarUrl) {
          updated.avatarUrl = res.avatarUrl ?? null;
          changed = true;
        }
        if (res.firstName && res.firstName !== latest.firstName) {
          updated.firstName = res.firstName;
          changed = true;
        }
        if (res.lastName && res.lastName !== latest.lastName) {
          updated.lastName = res.lastName;
          changed = true;
        }
        if (res.email && res.email !== latest.email) {
          updated.email = res.email;
          changed = true;
        }
        if (!changed) return;
        setUser(updated);
      } catch {
        /* profile optional for navigation */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user?.id, setUser]);

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
        <main
          className={cn(
            "flex-1 min-h-0",
            isChatPage
              ? "flex flex-col overflow-hidden p-0"
              : "overflow-auto p-6",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
