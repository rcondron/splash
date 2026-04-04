"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AuditEvent } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  History,
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
  MessageSquare,
  Sparkles,
  FileText,
  Upload,
  User,
  ShieldCheck,
  ListFilter,
} from "lucide-react";

interface AuditTabProps {
  voyageId: string;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  create: { label: "Created", icon: Plus, color: "text-emerald-600 bg-emerald-50" },
  update: { label: "Updated", icon: Pencil, color: "text-blue-600 bg-blue-50" },
  delete: { label: "Deleted", icon: Trash2, color: "text-red-600 bg-red-50" },
  status_change: { label: "Status Changed", icon: ArrowRightLeft, color: "text-purple-600 bg-purple-50" },
  message_sent: { label: "Message Sent", icon: MessageSquare, color: "text-cyan-600 bg-cyan-50" },
  term_extracted: { label: "Terms Extracted", icon: Sparkles, color: "text-amber-600 bg-amber-50" },
  term_confirmed: { label: "Term Confirmed", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
  term_rejected: { label: "Term Rejected", icon: Trash2, color: "text-red-600 bg-red-50" },
  recap_generated: { label: "Recap Generated", icon: FileText, color: "text-violet-600 bg-violet-50" },
  contract_generated: { label: "Contract Generated", icon: FileText, color: "text-indigo-600 bg-indigo-50" },
  file_uploaded: { label: "File Uploaded", icon: Upload, color: "text-teal-600 bg-teal-50" },
  participant_added: { label: "Participant Added", icon: User, color: "text-sky-600 bg-sky-50" },
  participant_removed: { label: "Participant Removed", icon: User, color: "text-orange-600 bg-orange-50" },
};

const DEFAULT_ACTION_CONFIG = {
  label: "Action",
  icon: History,
  color: "text-slate-600 bg-slate-50",
};

function formatDescription(event: AuditEvent): string {
  const actor = event.user
    ? `${event.user.firstName} ${event.user.lastName}`
    : "System";
  const config = ACTION_CONFIG[event.action] ?? DEFAULT_ACTION_CONFIG;
  const entity = event.entityType?.replace(/_/g, " ") ?? "record";

  let extra = "";
  if (event.details) {
    if (event.details.from && event.details.to) {
      extra = ` from "${event.details.from}" to "${event.details.to}"`;
    } else if (event.details.name) {
      extra = `: ${event.details.name}`;
    }
  }

  return `${actor} ${config.label.toLowerCase()} ${entity}${extra}`;
}

export function AuditTab({ voyageId }: AuditTabProps) {
  const [filterAction, setFilterAction] = useState<string>("all");

  const { data: events = [], isLoading } = useQuery<AuditEvent[]>({
    queryKey: ["audit", voyageId],
    queryFn: () => api.get(`/voyages/${voyageId}/audit`),
  });

  const filteredEvents =
    filterAction === "all"
      ? events
      : events.filter((e) => e.action === filterAction);

  const uniqueActions = Array.from(new Set(events.map((e) => e.action)));

  const formatTimestamp = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Audit Trail
        </h3>
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {uniqueActions.map((action) => {
                const config = ACTION_CONFIG[action] ?? DEFAULT_ACTION_CONFIG;
                return (
                  <SelectItem key={action} value={action}>
                    {config.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No audit events</p>
          <p className="text-xs text-muted-foreground mt-1">
            Activity will be recorded as changes are made
          </p>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {filteredEvents.map((event, index) => {
              const config = ACTION_CONFIG[event.action] ?? DEFAULT_ACTION_CONFIG;
              const Icon = config.icon;
              const isLast = index === filteredEvents.length - 1;

              return (
                <div key={event.id} className="relative flex items-start gap-4 py-3 pl-0">
                  {/* Timeline dot with icon */}
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm leading-snug">
                      {formatDescription(event)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(event.createdAt)}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {(ACTION_CONFIG[event.action] ?? DEFAULT_ACTION_CONFIG).label}
                      </Badge>
                    </div>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="mt-2 rounded-md bg-muted/50 p-2.5 text-xs font-mono text-muted-foreground">
                        {Object.entries(event.details).map(([key, val]) => (
                          <div key={key}>
                            <span className="font-semibold">{key}:</span>{" "}
                            {String(val)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
