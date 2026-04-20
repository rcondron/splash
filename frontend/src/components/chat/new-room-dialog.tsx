"use client";

import { useState } from "react";
import { Loader2, Phone, MessageCircle, Send } from "lucide-react";
import { quintApi } from "@/lib/api";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StartChatResponse {
  success: boolean;
  room_id: string | null;
  user_id: string | null;
  displayName: string | null;
  invited: boolean;
  phone?: string;
}

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
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  const reset = () => {
    setPhone("");
    setError("");
    setInviteSent(null);
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleStart = async () => {
    const cleaned = phone.replace(/[\s()-]/g, "");
    if (!cleaned || cleaned.length < 7) {
      setError("Enter a valid phone number (include country code, e.g. +1...)");
      return;
    }
    const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

    setLoading(true);
    setError("");
    setInviteSent(null);

    try {
      const res = await quintApi.post<StartChatResponse>(
        "/v1/rooms/start-chat",
        { phoneNumber: normalized },
      );

      if (res.room_id) {
        onCreated(
          res.room_id,
          res.displayName || formatPhoneDisplay(normalized) || normalized,
        );
        reset();
      } else if (res.invited) {
        setInviteSent(res.phone || normalized);
      } else {
        setError("Unexpected response from server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {inviteSent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <Send className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Invite sent!
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  We sent an SMS to{" "}
                  <span className="font-medium text-slate-700">
                    {inviteSent}
                  </span>{" "}
                  inviting them to join SPLASH. The chat will appear once they
                  sign up.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="mt-2"
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="+1 555 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStart()}
                    className="pl-10"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-400">
                  If they&apos;re on SPLASH, a chat opens instantly. If not,
                  we&apos;ll send them an SMS invite.
                </p>
              </div>
              <Button
                onClick={handleStart}
                disabled={loading || !phone.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Start Chat
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
