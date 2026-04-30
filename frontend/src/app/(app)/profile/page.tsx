"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Save,
  Trash2,
  User as UserIcon,
} from "lucide-react";
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
  companyName?: string;
  jobTitle?: string;
  timezone?: string;
  avatarUrl?: string | null;
}

interface UserLocation {
  latitude?: number | null;
  longitude?: number | null;
  city?: string;
  country?: string;
  location_updated_at?: string | null;
}

function normalizeLocationFromApi(data: unknown): UserLocation {
  const d = data as Record<string, unknown>;
  const raw = d?.location ?? d;
  if (!raw || typeof raw !== "object") {
    return {
      latitude: null,
      longitude: null,
      city: "",
      country: "",
    };
  }
  const loc = raw as Record<string, unknown>;
  const lat = loc.latitude;
  const lon = loc.longitude;
  return {
    latitude: typeof lat === "number" ? lat : null,
    longitude: typeof lon === "number" ? lon : null,
    city: String(loc.city ?? ""),
    country: String(loc.country ?? ""),
    location_updated_at:
      typeof loc.updatedAt === "string"
        ? loc.updatedAt
        : typeof loc.location_updated_at === "string"
          ? loc.location_updated_at
          : null,
  };
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
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [timezone, setTimezone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [location, setLocation] = useState<UserLocation>({
    latitude: null,
    longitude: null,
    city: "",
    country: "",
  });
  const [locLoading, setLocLoading] = useState(true);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  useEffect(() => {
    quintApi
      .get<unknown>("/v1/users/location")
      .then((res) => setLocation(normalizeLocationFromApi(res)))
      .catch(() => {})
      .finally(() => setLocLoading(false));
  }, []);

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
        setCompanyName(res.companyName ?? "");
        setJobTitle(res.jobTitle ?? "");
        setTimezone(res.timezone ?? "");
        setUser({
          ...u,
          firstName: res.firstName ?? "",
          lastName: res.lastName ?? "",
          email: res.email ?? "",
          phone: res.phone?.trim() || u.phone,
          avatarUrl:
            res.avatarUrl !== undefined ? res.avatarUrl : u.avatarUrl,
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
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        timezone: timezone.trim(),
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

  const saveLocation = async () => {
    setSavingLocation(true);
    setLocationSaved(false);
    try {
      await quintApi.put("/v1/users/location", {
        latitude: location.latitude ?? 0,
        longitude: location.longitude ?? 0,
        city: location.city ?? "",
        country: location.country ?? "",
      });
      setLocationSaved(true);
      setTimeout(() => setLocationSaved(false), 2500);
      toast.success("Location saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save location",
      );
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your photo is synced to your account (Matrix). Name, email, contact
          details, and location are saved here as well.
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
            const { avatarUrl: mxc } = await uploadProfileAvatar(jpegDataUrl);
            toast.success("Profile picture updated");
            if (mxc) {
              const latest = useAuthStore.getState().user;
              if (latest) setUser({ ...latest, avatarUrl: mxc });
            }
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
                <div className="sm:col-span-2 border-t border-slate-100 pt-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    Contact info
                  </p>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="companyName"
                        className="text-xs font-medium uppercase tracking-wider text-slate-400"
                      >
                        Company
                      </label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        autoComplete="organization"
                        className="mt-1"
                        placeholder="e.g. Acme Maritime Ltd."
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="jobTitle"
                        className="text-xs font-medium uppercase tracking-wider text-slate-400"
                      >
                        Job title
                      </label>
                      <Input
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        autoComplete="organization-title"
                        className="mt-1"
                        placeholder="e.g. Chartering Manager"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="timezone"
                        className="text-xs font-medium uppercase tracking-wider text-slate-400"
                      >
                        Timezone
                      </label>
                      <Input
                        id="timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        autoComplete="off"
                        className="mt-1 font-mono text-sm"
                        placeholder="e.g. Europe/London or America/New_York"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        IANA timezone name. Also editable under Settings →
                        Preferences.
                      </p>
                    </div>
                  </div>
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
            For language, currency, and measurement preferences, go to{" "}
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

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MapPin className="h-5 w-5 text-emerald-600" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {locLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading location…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500" htmlFor="loc-city">
                    City
                  </label>
                  <Input
                    id="loc-city"
                    value={location.city ?? ""}
                    onChange={(e) =>
                      setLocation((l) => ({ ...l, city: e.target.value }))
                    }
                    placeholder="e.g. London"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500" htmlFor="loc-country">
                    Country
                  </label>
                  <Input
                    id="loc-country"
                    value={location.country ?? ""}
                    onChange={(e) =>
                      setLocation((l) => ({ ...l, country: e.target.value }))
                    }
                    placeholder="e.g. United Kingdom"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500" htmlFor="loc-lat">
                    Latitude
                  </label>
                  <Input
                    id="loc-lat"
                    type="number"
                    step="any"
                    value={location.latitude ?? ""}
                    onChange={(e) =>
                      setLocation((l) => ({
                        ...l,
                        latitude: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    placeholder="51.5074"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500" htmlFor="loc-lon">
                    Longitude
                  </label>
                  <Input
                    id="loc-lon"
                    type="number"
                    step="any"
                    value={location.longitude ?? ""}
                    onChange={(e) =>
                      setLocation((l) => ({
                        ...l,
                        longitude: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    placeholder="-0.1278"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={() => void saveLocation()}
                disabled={savingLocation}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                {savingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : locationSaved ? (
                  <>
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-3.5 w-3.5" />
                    Save location
                  </>
                )}
              </Button>
            </>
          )}
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
