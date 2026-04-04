"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { VoyageParticipant, ParticipantRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  Users,
  MoreHorizontal,
  Trash2,
  Loader2,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

interface ParticipantsPanelProps {
  voyageId: string;
}

const ROLE_CONFIG: Record<ParticipantRole, { label: string; className: string }> = {
  [ParticipantRole.OWNER]: {
    label: "Owner",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [ParticipantRole.CHARTERER]: {
    label: "Charterer",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [ParticipantRole.OWNER_BROKER]: {
    label: "Owner Broker",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  [ParticipantRole.CHARTERER_BROKER]: {
    label: "Charterer Broker",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  [ParticipantRole.OPERATOR]: {
    label: "Operator",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function ParticipantsPanel({ voyageId }: ParticipantsPanelProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<ParticipantRole>(ParticipantRole.OPERATOR);

  const { data: participants = [], isLoading } = useQuery<VoyageParticipant[]>({
    queryKey: ["participants", voyageId],
    queryFn: () => api.get(`/voyages/${voyageId}/participants`),
  });

  const addMutation = useMutation({
    mutationFn: (data: { email: string; role: ParticipantRole }) =>
      api.post(`/voyages/${voyageId}/participants`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", voyageId] });
      setShowAddDialog(false);
      setAddEmail("");
      setAddRole(ParticipantRole.OPERATOR);
      toast.success("Participant added");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add participant");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (participantId: string) =>
      api.delete(`/voyages/${voyageId}/participants/${participantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", voyageId] });
      toast.success("Participant removed");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove participant");
    },
  });

  const handleAdd = () => {
    if (!addEmail.trim()) return;
    addMutation.mutate({ email: addEmail, role: addRole });
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Participants
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      {participants.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No participants yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {participants.map((participant) => {
            const user = participant.user;
            const company = participant.company;
            const initials = user
              ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`
              : "?";
            const roleConfig =
              ROLE_CONFIG[participant.role] ?? ROLE_CONFIG[ParticipantRole.OPERATOR];

            return (
              <Card key={participant.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {user
                          ? `${user.firstName} ${user.lastName}`
                          : "Unknown User"}
                      </span>
                      <Badge variant="outline" className={roleConfig.className}>
                        {roleConfig.label}
                      </Badge>
                    </div>
                    {company && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {company.name}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => removeMutation.mutate(participant.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Participant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
            <DialogDescription>
              Invite a user to this voyage by email address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                placeholder="user@company.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={addRole}
                onValueChange={(val) => setAddRole(val as ParticipantRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
