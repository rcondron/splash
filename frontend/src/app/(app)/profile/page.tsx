"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Camera, Loader2, Trash2, User as UserIcon, Save } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import {
  getAvatarSrc,
  uploadProfileAvatar,
  clearProfileAvatar,
} from "@/lib/avatar-url";
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog";
import {
  formatPhoneDisplay,
  sanitizeFirstNameForForm,
} from "@/lib/format-phone";
import { quintApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

interface ProfileMeResponse {
  success?: boolean;
  matrixUserId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export default function ProfilePage() {
  const { user, matrixUserId, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const u = user;
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      try {
        const res = await quintApi.get<ProfileMeResponse>("/v1/profile/me");
        if (cancelled) return;
        setFirstName(res.firstName ?? "");
        setLastName(res.lastName ?? "");
        setEmail(res.email ?? "");
        setUser({
          ...u,
          firstName: res.firstName ?? "",
          lastName: res.lastName ?? "",
          email: res.email ?? "",
          phone: res.phone?.trim() || u.phone,
        });
      } catch {
        if (!cancelled) {
          setFirstName(sanitizeFirstNameForForm(u.firstName, matrixUserId));
          setLastName((u.lastName ?? "").trim());
          setEmail((u.email ?? "").trim());
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, matrixUserId, setUser]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setCropSrc((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCropOpen(true);
  };

  const onCropDialogOpenChange = (open: boolean) => {
    setCropOpen(open);
    if (!open) {
      setCropSrc((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    }
  };

  const clearAvatar = async () => {
    setError(null);
    setUser({ ...user, avatarUrl: null });
    try {
      await clearProfileAvatar();
    } catch (e) {
      console.error("clearProfileAvatar failed:", e);
      toast.error("Avatar cleared locally but sync to server failed");
    }
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setProfileSaved(false);
    try {
      const res = await quintApi.put<ProfileMeResponse>("/v1/profile/me", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      setUser({
        ...user,
        firstName: res.firstName ?? firstName.trim(),
        lastName: res.lastName ?? lastName.trim(),
        email: res.email ?? email.trim(),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
      toast.success("Profile saved");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not save profile.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your photo is stored in this browser session. Name and email are saved
          to your account.
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
              <AvatarFallback className="bg-blue-600 text-white">
                <UserIcon className="h-14 w-14" aria-hidden />
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
                disabled={cropOpen}
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Upload photo
              </Button>
              {user.avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-600"
                  onClick={clearAvatar}
                  disabled={cropOpen}
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
            JPEG, PNG, WebP, or GIF (max 8MB). You&apos;ll crop to a square
            before it&apos;s saved.
          </p>
        </CardContent>
      </Card>

      <AvatarCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={onCropDialogOpenChange}
        onComplete={async (jpegDataUrl) => {
          setUser({ ...user, avatarUrl: jpegDataUrl });
          try {
            await uploadProfileAvatar(jpegDataUrl);
            toast.success("Profile picture updated");
          } catch (e) {
            console.error("uploadProfileAvatar failed:", e);
            const msg =
              e instanceof Error ? e.message : "Server sync failed";
            toast.error(`Avatar saved locally but sync failed: ${msg}`);
          }
        }}
        onError={(msg) => setError(msg)}
      />

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="flex items-center gap-2 py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading profile…
            </div>
          ) : (
            <form onSubmit={saveAccount} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="text-xs font-medium uppercase tracking-wider text-slate-400"
                  >
                    First name
                  </label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    className="mt-1"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="text-xs font-medium uppercase tracking-wider text-slate-400"
                  >
                    Last name
                  </label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className="mt-1"
                    placeholder="Last name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="email"
                    className="text-xs font-medium uppercase tracking-wider text-slate-400"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="mt-1"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <ReadOnlyField
                label="Phone"
                value={formatPhoneDisplay(user.phone) || user.phone || "—"}
              />
              <ReadOnlyField
                label="Matrix user ID"
                value={matrixUserId ?? "—"}
                mono
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingProfile ? "Saving…" : "Save changes"}
                </Button>
                {profileSaved && (
                  <span className="text-sm text-emerald-600">Saved.</span>
                )}
              </div>
            </form>
          )}
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

function ReadOnlyField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm text-slate-900 ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
