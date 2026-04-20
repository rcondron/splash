"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

/** Radix Select cannot use empty string as value — use this sentinel for “not set”. */
const SELECT_NONE = "__none__";

function fromSelectValue(v: string): string {
  return v === SELECT_NONE ? "" : v;
}

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "nl", label: "Dutch" },
  { value: "sv", label: "Swedish" },
  { value: "no", label: "Norwegian" },
  { value: "da", label: "Danish" },
  { value: "fi", label: "Finnish" },
  { value: "pl", label: "Polish" },
  { value: "ru", label: "Russian" },
  { value: "uk", label: "Ukrainian" },
  { value: "el", label: "Greek" },
  { value: "tr", label: "Turkish" },
  { value: "ar", label: "Arabic" },
  { value: "he", label: "Hebrew" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "zh-TW", label: "Chinese (Traditional)" },
];

const MEASUREMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "metric", label: "Metric (km, °C, kg)" },
  { value: "imperial", label: "Imperial (mi, °F, lb)" },
];

const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "JPY", label: "JPY — Japanese yen" },
  { value: "CNY", label: "CNY — Chinese yuan" },
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "CAD", label: "CAD — Canadian dollar" },
  { value: "CHF", label: "CHF — Swiss franc" },
  { value: "HKD", label: "HKD — Hong Kong dollar" },
  { value: "SGD", label: "SGD — Singapore dollar" },
  { value: "INR", label: "INR — Indian rupee" },
  { value: "KRW", label: "KRW — South Korean won" },
  { value: "BRL", label: "BRL — Brazilian real" },
  { value: "MXN", label: "MXN — Mexican peso" },
  { value: "NOK", label: "NOK — Norwegian krone" },
  { value: "SEK", label: "SEK — Swedish krona" },
  { value: "DKK", label: "DKK — Danish krone" },
  { value: "NZD", label: "NZD — New Zealand dollar" },
  { value: "ZAR", label: "ZAR — South African rand" },
  { value: "AED", label: "AED — UAE dirham" },
];

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function useTimezoneOptions(current?: string | null): string[] {
  return useMemo(() => {
    let list: string[] = [];
    try {
      if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        list = Intl.supportedValuesOf("timeZone");
      }
    } catch {
      list = [];
    }
    if (!list.length) {
      list = [...FALLBACK_TIMEZONES];
    }
    const tz = current?.trim();
    if (tz && !list.includes(tz)) {
      list = [tz, ...list];
    }
    return [...list].sort((a, b) => a.localeCompare(b));
  }, [current]);
}

function PreferenceSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
  allowUnset = true,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  allowUnset?: boolean;
}) {
  const trimmed = (value ?? "").trim();
  const inOptions = options.some((o) => o.value === trimmed);
  const selectValue = trimmed === "" ? SELECT_NONE : trimmed;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(fromSelectValue(next))}
      >
        <SelectTrigger className="border-slate-200 bg-white text-slate-900">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {allowUnset && (
            <SelectItem value={SELECT_NONE}>Not set</SelectItem>
          )}
          {trimmed && !inOptions && (
            <SelectItem value={trimmed}>{trimmed} (current)</SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TimezoneSelect({
  label,
  value,
  onChange,
  zones,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (next: string) => void;
  zones: string[];
}) {
  const trimmed = (value ?? "").trim();
  const inList = trimmed === "" || zones.includes(trimmed);
  const selectValue = trimmed === "" ? SELECT_NONE : trimmed;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <Select
        value={inList ? selectValue : trimmed}
        onValueChange={(next) => onChange(fromSelectValue(next))}
      >
        <SelectTrigger className="border-slate-200 bg-white text-slate-900">
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent className="max-h-[min(24rem,70vh)]">
          <SelectItem value={SELECT_NONE}>Not set</SelectItem>
          {!inList && trimmed && (
            <SelectItem value={trimmed}>{trimmed} (current)</SelectItem>
          )}
          {zones.map((z) => (
            <SelectItem key={z} value={z}>
              {z}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();

  const [location, setLocation] = useState<UserLocation>({});
  const [context, setContext] = useState<UserContext>({});
  const [locLoading, setLocLoading] = useState(true);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const timezoneZones = useTimezoneOptions(context.timezone);

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
      toast.success("Location saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save location",
      );
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
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save preferences",
      );
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PreferenceSelect
                  label="Preferred language"
                  placeholder="Select language"
                  value={context.preferred_language}
                  onChange={(preferred_language) =>
                    setContext((c) => ({ ...c, preferred_language }))
                  }
                  options={LANGUAGE_OPTIONS}
                />
                <TimezoneSelect
                  label="Timezone"
                  value={context.timezone}
                  onChange={(timezone) =>
                    setContext((c) => ({ ...c, timezone }))
                  }
                  zones={timezoneZones}
                />
                <PreferenceSelect
                  label="Measurement system"
                  placeholder="Select units"
                  value={context.measurement_system}
                  onChange={(measurement_system) =>
                    setContext((c) => ({ ...c, measurement_system }))
                  }
                  options={MEASUREMENT_OPTIONS}
                />
                <PreferenceSelect
                  label="Currency"
                  placeholder="Select currency"
                  value={context.currency}
                  onChange={(currency) =>
                    setContext((c) => ({ ...c, currency }))
                  }
                  options={CURRENCY_OPTIONS}
                />
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
