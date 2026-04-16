"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Loader2, Trash2, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { getAvatarSrc, resizeImageFileToJpegDataUrl } from "@/lib/avatar-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function ProfilePage() {
  const { user, matrixUserId, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image must be 8MB or smaller.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await resizeImageFileToJpegDataUrl(file);
      setUser({ ...user, avatarUrl: dataUrl });
    } catch {
      setError("Could not process that image. Try another file.");
    } finally {
      setUploading(false);
    }
  };

  const clearAvatar = () => {
    setError(null);
    setUser({ ...user, avatarUrl: null });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your photo is stored in this browser session. Name and email may still
          be managed by your administrator.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserIcon className="h-5 w-5 text-blue-600" />
            Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-28 w-28 border-2 border-slate-200">
              <AvatarImage src={getAvatarSrc(user.avatarUrl)} alt="" />
              <AvatarFallback className="bg-blue-600 text-2xl text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onPickFile}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {uploading ? "Processing…" : "Upload photo"}
              </Button>
              {user.avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-600"
                  onClick={clearAvatar}
                  disabled={uploading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove photo
                </Button>
              )}
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-slate-400">
            JPEG, PNG, WebP, or GIF. Large images are resized automatically.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="First name" value={user.firstName} />
            <Field label="Last name" value={user.lastName} />
            <Field label="Email" value={user.email} className="sm:col-span-2" />
            <Field
              label="Matrix user ID"
              value={matrixUserId}
              mono
              className="sm:col-span-2"
            />
          </div>
          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
            For location, language, and other preferences, go to{" "}
            <Link
              href="/settings"
              className="font-medium text-blue-600 hover:underline"
            >
              Settings
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm text-slate-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
