"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ExtractedTerm, TermType, ExtractionStatus } from "@/types";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Check,
  X,
  Pencil,
  AlertTriangle,
  ChevronRight,
  Loader2,
  ListFilter,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

const TERM_LABELS: Record<TermType, string> = {
  [TermType.FREIGHT_RATE]: "Freight Rate",
  [TermType.LAYCAN]: "Laycan",
  [TermType.LOAD_PORT]: "Load Port",
  [TermType.DISCHARGE_PORT]: "Discharge Port",
  [TermType.CARGO_TYPE]: "Cargo Type",
  [TermType.CARGO_QUANTITY]: "Cargo Quantity",
  [TermType.DEMURRAGE]: "Demurrage",
  [TermType.LAYTIME]: "Laytime",
  [TermType.VESSEL_NAME]: "Vessel Name",
  [TermType.VESSEL_TYPE]: "Vessel Type",
  [TermType.COMMISSION]: "Commission",
  [TermType.PAYMENT_TERMS]: "Payment Terms",
  [TermType.GOVERNING_LAW]: "Governing Law",
  [TermType.ARBITRATION]: "Arbitration",
  [TermType.OTHER]: "Other",
};

const STATUS_STYLES: Record<
  ExtractionStatus,
  { label: string; className: string }
> = {
  [ExtractionStatus.PENDING]: {
    label: "Proposed",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  [ExtractionStatus.CONFIRMED]: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [ExtractionStatus.REJECTED]: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  [ExtractionStatus.MODIFIED]: {
    label: "Modified",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

interface TermsTabProps {
  voyageId: string;
}

export function TermsTab({ voyageId }: TermsTabProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [editTerm, setEditTerm] = useState<ExtractedTerm | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const { data: terms = [], isLoading } = useQuery<ExtractedTerm[]>({
    queryKey: ["voyages", voyageId, "terms"],
    queryFn: () => api.get(`/voyages/${voyageId}/terms`),
  });

  const extractMutation = useMutation({
    mutationFn: () =>
      api.post(`/voyages/${voyageId}/ai/extract-terms`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["voyages", voyageId, "terms"],
      });
      toast.success("Terms extracted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      termId,
      status,
      value,
    }: {
      termId: string;
      status?: ExtractionStatus;
      value?: string;
    }) =>
      api.patch(`/voyages/${voyageId}/terms/${termId}`, { status, value }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["voyages", voyageId, "terms"],
      });
      setEditTerm(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filter
  const filtered =
    filter === "all"
      ? terms
      : terms.filter((t) => t.status === filter);

  // Group by term type
  const grouped = filtered.reduce(
    (acc, term) => {
      const key = term.termType;
      if (!acc[key]) acc[key] = [];
      acc[key].push(term);
      return acc;
    },
    {} as Record<string, ExtractedTerm[]>,
  );

  // Detect conflicts: multiple terms of same type with different values and pending/confirmed status
  const conflicts = new Set<string>();
  Object.entries(grouped).forEach(([type, terms]) => {
    const active = terms.filter(
      (t) =>
        t.status === ExtractionStatus.PENDING ||
        t.status === ExtractionStatus.CONFIRMED,
    );
    const uniqueValues = new Set(active.map((t) => t.value));
    if (uniqueValues.size > 1) {
      conflicts.add(type);
    }
  });

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "bg-emerald-500";
    if (c >= 0.5) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value={ExtractionStatus.PENDING}>
                Proposed
              </SelectItem>
              <SelectItem value={ExtractionStatus.CONFIRMED}>
                Accepted
              </SelectItem>
              <SelectItem value={ExtractionStatus.REJECTED}>
                Rejected
              </SelectItem>
              <SelectItem value={ExtractionStatus.MODIFIED}>
                Modified
              </SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtered.length} term{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          onClick={() => extractMutation.mutate()}
          disabled={extractMutation.isPending}
        >
          {extractMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Extract Terms
        </Button>
      </div>

      {/* Terms list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-3 rounded-lg border p-4"
            >
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-48 rounded bg-muted flex-1" />
              <div className="h-6 w-16 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No terms extracted yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm text-center">
            Use AI extraction to automatically identify key commercial
            terms from your conversations and messages.
          </p>
          <Button
            onClick={() => extractMutation.mutate()}
            disabled={extractMutation.isPending}
          >
            {extractMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Extract Terms
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([type, typeTerms]) => {
            const hasConflict = conflicts.has(type);
            const isExpanded = expandedType === type;
            // Show latest term prominently, rest as superseded
            const sorted = [...typeTerms].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );
            const latest = sorted[0];
            const history = sorted.slice(1);
            const statusCfg = STATUS_STYLES[latest.status];

            return (
              <div
                key={type}
                className={`rounded-lg border transition-colors ${
                  latest.status === ExtractionStatus.CONFIRMED
                    ? "border-l-4 border-l-emerald-500"
                    : latest.status === ExtractionStatus.REJECTED
                      ? "border-l-4 border-l-red-300"
                      : ""
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Term type */}
                  <div className="w-32 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {TERM_LABELS[type as TermType] ?? type}
                      </span>
                      {hasConflict && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Conflicting values detected
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {latest.proposedBy && (
                      <span className="text-[10px] text-muted-foreground capitalize">
                        by {latest.proposedBy}
                      </span>
                    )}
                  </div>

                  {/* Value */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {latest.value}
                    </p>
                    {latest.label && latest.label !== latest.value && (
                      <p className="text-xs text-muted-foreground truncate">
                        {latest.label}
                      </p>
                    )}
                  </div>

                  {/* Confidence */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="w-16 shrink-0">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${confidenceColor(latest.confidence)}`}
                              style={{
                                width: `${Math.round(latest.confidence * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {Math.round(latest.confidence * 100)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Confidence:{" "}
                        {Math.round(latest.confidence * 100)}%
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Status */}
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${statusCfg.className}`}
                  >
                    {statusCfg.label}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {latest.status === ExtractionStatus.PENDING && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() =>
                            updateMutation.mutate({
                              termId: latest.id,
                              status: ExtractionStatus.CONFIRMED,
                            })
                          }
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            updateMutation.mutate({
                              termId: latest.id,
                              status: ExtractionStatus.REJECTED,
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setEditTerm(latest);
                        setEditValue(latest.value);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {latest.messageId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <a href={`#message-${latest.messageId}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Expand history */}
                  {history.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setExpandedType(isExpanded ? null : type)
                      }
                    >
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </Button>
                  )}
                </div>

                {/* History / superseded terms */}
                {isExpanded && history.length > 0 && (
                  <div className="border-t bg-muted/30 px-4 py-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Previous values
                    </p>
                    {history.map((term) => {
                      const sCfg = STATUS_STYLES[term.status];
                      return (
                        <div
                          key={term.id}
                          className="flex items-center gap-3 text-sm opacity-70"
                        >
                          <span className="flex-1 truncate">{term.value}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${sCfg.className}`}
                          >
                            {sCfg.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(term.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={!!editTerm}
        onOpenChange={(open) => !open && setEditTerm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Term</DialogTitle>
            <DialogDescription>
              {editTerm &&
                `Update the value for ${TERM_LABELS[editTerm.termType] ?? editTerm.termType}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Value</label>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTerm(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editTerm) {
                  updateMutation.mutate({
                    termId: editTerm.id,
                    value: editValue,
                    status: ExtractionStatus.MODIFIED,
                  });
                }
              }}
              disabled={!editValue.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
