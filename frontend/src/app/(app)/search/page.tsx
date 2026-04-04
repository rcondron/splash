"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { VoyageStatus } from "@/types";
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
  Search,
  Ship,
  MessageSquare,
  ClipboardList,
  ScrollText,
  Loader2,
  ArrowRight,
} from "lucide-react";

type SearchType = "all" | "voyages" | "messages" | "terms" | "recaps";

interface SearchResult {
  type: "voyage" | "message" | "term" | "recap";
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeClassName?: string;
  linkUrl: string;
  date?: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  voyage: Ship,
  message: MessageSquare,
  term: ClipboardList,
  recap: ScrollText,
};

const STATUS_STYLES: Record<string, string> = {
  [VoyageStatus.DRAFT]: "bg-slate-100 text-slate-700",
  [VoyageStatus.INQUIRY]: "bg-blue-50 text-blue-700",
  [VoyageStatus.NEGOTIATION]: "bg-amber-50 text-amber-700",
  [VoyageStatus.SUBJECTS]: "bg-purple-50 text-purple-700",
  [VoyageStatus.FIXED]: "bg-emerald-50 text-emerald-700",
  [VoyageStatus.FAILED]: "bg-red-50 text-red-700",
  [VoyageStatus.CANCELLED]: "bg-gray-100 text-gray-500",
};

export default function SearchPage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type !== "all") params.set("type", type);
    if (statusFilter !== "all") params.set("status", statusFilter);
    return params.toString();
  };

  const { data, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: ["search", query, type, statusFilter],
    queryFn: () =>
      api.get<SearchResponse>(`/search?${buildSearchParams()}`),
    enabled: query.length >= 2,
  });

  const results = data?.results ?? [];

  // Group results by type
  const grouped = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const typeLabel = (t: string) => {
    switch (t) {
      case "voyage":
        return "Voyages";
      case "message":
        return "Messages";
      case "term":
        return "Terms";
      case "recap":
        return "Recaps";
      default:
        return t;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search across voyages, messages, terms, and recaps
        </p>
      </div>

      {/* Search bar and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search voyages, messages, terms..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-10"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Select value={type} onValueChange={(v) => setType(v as SearchType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="voyages">Voyages</SelectItem>
            <SelectItem value="messages">Messages</SelectItem>
            <SelectItem value="terms">Terms</SelectItem>
            <SelectItem value="recaps">Recaps</SelectItem>
          </SelectContent>
        </Select>

        {(type === "all" || type === "voyages") && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(VoyageStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  <span className="capitalize">
                    {status.replace("_", " ")}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results */}
      {query.length < 2 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Start typing to search</p>
          <p className="text-xs text-muted-foreground mt-1">
            Enter at least 2 characters to begin searching
          </p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-3 rounded-lg border p-4"
            >
              <div className="h-9 w-9 rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No results found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search query or filters
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {data?.total !== undefined && (
            <p className="text-sm text-muted-foreground">
              {data.total} result{data.total !== 1 ? "s" : ""} found
            </p>
          )}

          {Object.entries(grouped).map(([groupType, groupResults]) => {
            const Icon = TYPE_ICONS[groupType] ?? Search;
            return (
              <div key={groupType} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {typeLabel(groupType)}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {groupResults.length}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {groupResults.map((result) => {
                    const ResultIcon = TYPE_ICONS[result.type] ?? Search;
                    return (
                      <Card
                        key={`${result.type}-${result.id}`}
                        className="p-4 cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => router.push(result.linkUrl)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <ResultIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {result.title}
                              </span>
                              {result.badge && (
                                <Badge
                                  variant="outline"
                                  className={
                                    result.badgeClassName ??
                                    STATUS_STYLES[result.badge] ??
                                    ""
                                  }
                                >
                                  <span className="capitalize">
                                    {result.badge.replace("_", " ")}
                                  </span>
                                </Badge>
                              )}
                            </div>
                            {result.subtitle && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          {result.date && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDate(result.date)}
                            </span>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
