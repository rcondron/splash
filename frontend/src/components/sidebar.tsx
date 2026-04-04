"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Anchor,
  LayoutDashboard,
  Ship,
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/voyages", label: "Voyages", icon: Ship },
  { href: "/search", label: "Search", icon: Search },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  notificationCount?: number;
}

export function Sidebar({ notificationCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <Anchor className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-white">
              SPLASH
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const showBadge = item.href === "/notifications" && notificationCount > 0;

            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-blue-400")} />
                {!collapsed && <span>{item.label}</span>}
                {showBadge && (
                  <span
                    className={cn(
                      "flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white",
                      collapsed ? "absolute -right-1 -top-1" : "ml-auto",
                    )}
                  >
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-x-3 -translate-y-1/2 rounded-r-full bg-blue-400" />
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* Theme toggle */}
        <div className="px-3 pb-1">
          <ThemeToggle collapsed={collapsed} />
        </div>

        {/* Collapse toggle */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2 text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User section */}
        <div className="border-t border-slate-800 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-slate-800/60",
                  collapsed && "justify-center",
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-blue-600 text-xs text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 text-left">
                    <div className="truncate font-medium text-white">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {user?.email}
                    </div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel>
                <div className="truncate">{user?.firstName} {user?.lastName}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
