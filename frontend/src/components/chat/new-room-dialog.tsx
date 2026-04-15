"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { quintApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (roomId: string, name: string) => void;
}

export function NewRoomDialog({
  open,
  onOpenChange,
  onCreated,
}: NewRoomDialogProps) {
  const [name, setName] = useState("");
  const [inviteUser, setInviteUser] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Room name is required");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const invite = inviteUser.trim()
        ? [inviteUser.trim().startsWith("@") ? inviteUser.trim() : `@${inviteUser.trim()}`]
        : [];
      const res = await quintApi.post<{
        success: boolean;
        room_id: string;
      }>("/v1/rooms", { name: name.trim(), invite });
      onCreated(res.room_id, name.trim());
      setName("");
      setInviteUser("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Room Name
            </label>
            <Input
              placeholder="e.g. Voyage Discussion"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Invite User (optional)
            </label>
            <Input
              placeholder="@username:100.25.66.46"
              value={inviteUser}
              onChange={(e) => setInviteUser(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Full Matrix user ID to invite, or leave blank
            </p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Room"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
