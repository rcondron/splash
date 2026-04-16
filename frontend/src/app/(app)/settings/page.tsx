"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Globe,
  Loader2,
  Save,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { quintApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserLocation {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  location_updated_at?: string | null;
}

interface UserContext {
  preferred_language?: string | null;
  timezone?: string | null;
  measurement_system?: string | null;
  currency?: string | null;
}

export default function SettingsPage() {
  const { user } = useAuthStore();

  const [location, setLocation] = useState<UserLocation>({});
  const [context, setContext] = useState<UserContext>({});
  const [locLoading, setLocLoading] = useState(true);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    quintApi
      .get<{ success: boolean } & UserLocation>("/v1/users/location")
      .then((res) => setLocation(res))
      .catch(() => {})
      .finally(() => setLocLoading(false));
    quintApi
      .get<{ success: boolean } & UserContext>("/v1/user/context")
      .then((res) => setContext(res))
      .catch(() => {})
      .finally(() => setCtxLoading(false));
  }, []);

  const saveLocation = async () => {
    setSaving("location");
    try {
      await quintApi.put("/v1/users/location", {
        latitude: location.latitude ?? 0,
        longitude: location.longitude ?? 0,
        city: location.city ?? "",
        country: location.country ?? "",
      });
      setSaved("location");
      setTimeout(() => setSaved(null), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(null);
    }
  };

  const saveContext = async () => {
    setSaving("context");
    try {
      await quintApi.put("/v1/user/context", {
        preferred_language: context.preferred_language ?? "",
        timezone: context.timezone ?? "",
        measurement_system: context.measurement_system ?? "",
        currency: context.currency ?? "",
      });
      setSaved("context");
      setTimeout(() => setSaved(null), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your account information and preferences.
        </p>
      </div>

      <Link
        href="/profile"
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">Profile & photo</p>
          <p className="text-xs text-slate-500">
            {user?.firstName} {user?.lastName} · Manage avatar and account details
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </Link>

      {/* Location */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MapPin className="h-5 w-5 text-emerald-600" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {locLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">City</label>
                  <Input
                    value={location.city ?? ""}
                    onChange={(e) =>
                      setLocation((l) => ({ ...l, city: e.target.value }))
                    }
                    placeholder="e.g. London"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Country</label>
                  <Input
                    value={location.country ?? ""}
                    onChange={(e) =>
                      setLocation((l) => ({ ...l, country: e.target.value }))
                    }
                    placeholder="e.g. United Kingdom"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Latitude</label>
                  <Input
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
                  <label className="text-xs font-medium text-slate-500">Longitude</label>
                  <Input
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
              <SaveBtn
                onClick={saveLocation}
                saving={saving === "location"}
                saved={saved === "location"}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Preferences / Context */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Globe className="h-5 w-5 text-blue-600" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ctxLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">
                    Preferred Language
                  </label>
                  <Input
                    value={context.preferred_language ?? ""}
                    onChange={(e) =>
                      setContext((c) => ({
                        ...c,
                        preferred_language: e.target.value,
                      }))
                    }
                    placeholder="en"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Timezone</label>
                  <Input
                    value={context.timezone ?? ""}
                    onChange={(e) =>
                      setContext((c) => ({ ...c, timezone: e.target.value }))
                    }
                    placeholder="America/New_York"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">
                    Measurement System
                  </label>
                  <Input
                    value={context.measurement_system ?? ""}
                    onChange={(e) =>
                      setContext((c) => ({
                        ...c,
                        measurement_system: e.target.value,
                      }))
                    }
                    placeholder="metric"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Currency</label>
                  <Input
                    value={context.currency ?? ""}
                    onChange={(e) =>
                      setContext((c) => ({ ...c, currency: e.target.value }))
                    }
                    placeholder="USD"
                  />
                </div>
              </div>
              <SaveBtn
                onClick={saveContext}
                saving={saving === "context"}
                saved={saved === "context"}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SaveBtn({
  onClick,
  saving,
  saved,
}: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={saving}
      className="bg-blue-600 hover:bg-blue-700 text-white"
      size="sm"
    >
      {saving ? (
        <>
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          Saving…
        </>
      ) : saved ? (
        <>
          <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
          Saved
        </>
      ) : (
        <>
          <Save className="mr-2 h-3.5 w-3.5" />
          Save
        </>
      )}
    </Button>
  );
}
