"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/sidebar";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const [notificationCount, setNotificationCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.replace("/auth/login");
    } else {
      setReady(true);
    }
  }, [isAuthenticated, token, router]);

  useEffect(() => {
    if (!ready) return;
    api
      .get<{ unreadCount: number }>("/notifications/unread-count")
      .then((res) => setNotificationCount(res.unreadCount))
      .catch(() => {});
  }, [ready]);

  if (!ready) {
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
      <Sidebar notificationCount={notificationCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search voyages, contacts..."
              className="h-9 pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => router.push("/notifications")}
              className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
