"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Voyage, VoyageStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Ship,
  ArrowRight,
  Calendar,
  Package,
  ChevronLeft,
  ChevronRight,
  Anchor,
} from "lucide-react";

interface VoyagesResponse {
  data: Voyage[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_CONFIG: Record<
  VoyageStatus,
  { label: string; className: string }
> = {
  [VoyageStatus.DRAFT]: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  [VoyageStatus.INQUIRY]: {
    label: "Inquiry",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [VoyageStatus.NEGOTIATION]: {
    label: "Negotiation",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  [VoyageStatus.SUBJECTS]: {
    label: "Subjects",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  [VoyageStatus.FIXED]: {
    label: "Fixed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [VoyageStatus.FAILED]: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  [VoyageStatus.CANCELLED]: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

function VoyageRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
      <div className="h-6 w-20 rounded-full bg-muted" />
      <div className="hidden md:block h-3 w-40 rounded bg-muted" />
      <div className="hidden lg:block h-3 w-24 rounded bg-muted" />
      <div className="hidden lg:block h-3 w-20 rounded bg-muted" />
    </div>
  );
}

export default function VoyagesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (statusFilter && statusFilter !== "all")
    queryParams.set("status", statusFilter);
  queryParams.set("sort", sortBy);
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));

  const { data, isLoading } = useQuery<VoyagesResponse>({
    queryKey: ["voyages", search, statusFilter, sortBy, page],
    queryFn: () => api.get(`/voyages?${queryParams.toString()}`),
  });

  const voyages = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(1);
    },
    [],
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voyages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your chartering fixtures and negotiations
          </p>
        </div>
        <Button onClick={() => router.push("/voyages/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Voyage
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search voyages, vessels, ports..."
              value={search}
              onChange={handleSearch}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="laycanFrom">Laycan Start</SelectItem>
              <SelectItem value="vesselName">Vessel Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Voyage List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <VoyageRowSkeleton key={i} />
          ))
        ) : voyages.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Anchor className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No voyages found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first voyage"}
            </p>
            {!search && statusFilter === "all" && (
              <Button onClick={() => router.push("/voyages/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Voyage
              </Button>
            )}
          </Card>
        ) : (
          voyages.map((voyage) => {
            const status = STATUS_CONFIG[voyage.status] ?? STATUS_CONFIG[VoyageStatus.DRAFT];
            return (
              <Card
                key={voyage.id}
                className="flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-accent/40"
                onClick={() => router.push(`/voyages/${voyage.id}`)}
              >
                {/* Vessel icon */}
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Ship className="h-5 w-5" />
                </div>

                {/* Name + Reference */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">
                      {voyage.vesselName ?? "TBN"}
                    </span>
                    <Badge
                      variant="outline"
                      className={status.className}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {voyage.reference}
                  </p>
                </div>

                {/* Route */}
                <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                  <span className="font-medium text-foreground">
                    {voyage.loadPort ?? "--"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {voyage.dischargePort ?? "--"}
                  </span>
                </div>

                {/* Cargo */}
                <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                  <Package className="h-3.5 w-3.5" />
                  <span>
                    {voyage.cargoType ?? "--"}
                    {voyage.cargoQuantity
                      ? ` (${voyage.cargoQuantity.toLocaleString()} ${voyage.cargoUnit ?? "MT"})`
                      : ""}
                  </span>
                </div>

                {/* Laycan */}
                <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {formatDate(voyage.laycanFrom)} -{" "}
                    {formatDate(voyage.laycanTo)}
                  </span>
                </div>

                {/* Updated */}
                <div className="hidden xl:block text-xs text-muted-foreground shrink-0 w-16 text-right">
                  {timeAgo(voyage.updatedAt)}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}-
            {Math.min(page * limit, total)} of {total} voyages
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
