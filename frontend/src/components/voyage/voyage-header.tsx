"use client";

import { Voyage, VoyageStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Ship,
  ArrowRight,
  Calendar,
  Package,
  DollarSign,
  Pencil,
  ChevronDown,
} from "lucide-react";

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

const TRANSITION_MAP: Partial<Record<VoyageStatus, VoyageStatus[]>> = {
  [VoyageStatus.DRAFT]: [VoyageStatus.INQUIRY, VoyageStatus.CANCELLED],
  [VoyageStatus.INQUIRY]: [
    VoyageStatus.NEGOTIATION,
    VoyageStatus.FAILED,
    VoyageStatus.CANCELLED,
  ],
  [VoyageStatus.NEGOTIATION]: [
    VoyageStatus.SUBJECTS,
    VoyageStatus.FAILED,
    VoyageStatus.CANCELLED,
  ],
  [VoyageStatus.SUBJECTS]: [
    VoyageStatus.FIXED,
    VoyageStatus.NEGOTIATION,
    VoyageStatus.FAILED,
  ],
  [VoyageStatus.FIXED]: [VoyageStatus.CANCELLED],
};

interface VoyageHeaderProps {
  voyage: Voyage;
  onEdit?: () => void;
  onStatusChange?: (status: VoyageStatus) => void;
}

export function VoyageHeader({
  voyage,
  onEdit,
  onStatusChange,
}: VoyageHeaderProps) {
  const status = STATUS_CONFIG[voyage.status] ?? STATUS_CONFIG[VoyageStatus.DRAFT];
  const transitions = TRANSITION_MAP[voyage.status] ?? [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const participants = voyage.participants ?? [];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Core info */}
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ship className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight truncate">
                  {voyage.vesselName ?? "TBN"}
                </h1>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
                {voyage.reference && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {voyage.reference}
                  </span>
                )}
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="font-semibold">
                  {voyage.loadPort ?? "--"}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {voyage.dischargePort ?? "--"}
                </span>
              </div>

              {/* Key terms grid */}
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  <span>
                    {voyage.cargoType ?? "--"}
                    {voyage.cargoQuantity
                      ? ` / ${voyage.cargoQuantity.toLocaleString()} ${voyage.cargoUnit ?? "MT"}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {formatDate(voyage.laycanFrom)} -{" "}
                    {formatDate(voyage.laycanTo)}
                  </span>
                </div>
                {voyage.freightRate && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>
                      {voyage.freightRate.toLocaleString()}{" "}
                      {voyage.freightUnit ?? ""}
                    </span>
                  </div>
                )}
                {voyage.demurrageRate && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">DEM</span>
                    <span>
                      ${voyage.demurrageRate.toLocaleString()}/day
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Participants + actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Participant avatars */}
            {participants.length > 0 && (
              <TooltipProvider>
                <div className="flex -space-x-2">
                  {participants.slice(0, 4).map((p) => {
                    const user = p.user;
                    const initials = user
                      ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`
                      : "?";
                    return (
                      <Tooltip key={p.id}>
                        <TooltipTrigger asChild>
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">
                            {user
                              ? `${user.firstName} ${user.lastName}`
                              : "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {p.role.replace("_", " ")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {participants.length > 4 && (
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarFallback className="text-xs bg-muted">
                        +{participants.length - 4}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </TooltipProvider>
            )}

            {/* Edit */}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}

            {/* Status change */}
            {transitions.length > 0 && onStatusChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    Move to
                    <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {transitions.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => onStatusChange(s)}
                      >
                        <Badge
                          variant="outline"
                          className={`${cfg.className} mr-2`}
                        >
                          {cfg.label}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
