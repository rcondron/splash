"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon,
  Building2,
  Bell,
  Mail,
  Loader2,
  Save,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { User, Company } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NotificationPrefs {
  emailNewMessage: boolean;
  emailVoyageUpdate: boolean;
  emailTermExtracted: boolean;
  emailRecapGenerated: boolean;
  pushEnabled: boolean;
}

const defaultPrefs: NotificationPrefs = {
  emailNewMessage: true,
  emailVoyageUpdate: true,
  emailTermExtracted: true,
  emailRecapGenerated: false,
  pushEnabled: true,
};

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();

  // Profile form state
  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Company form state
  const [company, setCompany] = useState<{
    name: string;
    type: string;
    address: string;
    phone: string;
    website: string;
  }>({
    name: "",
    type: "",
    address: "",
    phone: "",
    website: "",
  });
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Load company data
  useEffect(() => {
    if (user?.companyId) {
      api
        .get<Company>(`/companies/${user.companyId}`)
        .then((res) => {
          setCompany({
            name: res.name ?? "",
            type: res.type ?? "",
            address: res.address ?? "",
            phone: res.phone ?? "",
            website: res.website ?? "",
          });
        })
        .catch(() => {});
    }
  }, [user?.companyId]);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      const updated = await api.patch<User>("/auth/me", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || null,
      });
      setUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      // Silently handle
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCompanySave = async () => {
    if (!user?.companyId) return;
    setCompanySaving(true);
    setCompanySaved(false);
    try {
      await api.patch(`/companies/${user.companyId}`, {
        name: company.name,
        address: company.address || null,
        phone: company.phone || null,
        website: company.website || null,
      });
      setCompanySaved(true);
      setTimeout(() => setCompanySaved(false), 3000);
    } catch {
      // Silently handle
    } finally {
      setCompanySaving(false);
    }
  };

  const handleNotifSave = async () => {
    setNotifSaving(true);
    setNotifSaved(false);
    try {
      await api.put("/notifications/preferences", notifPrefs);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    } catch {
      // Silently handle
    } finally {
      setNotifSaving(false);
    }
  };

  const toggleNotifPref = (key: keyof NotificationPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your account, company, and preferences.
        </p>
      </div>

      {/* Profile Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <UserIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>
                Your personal information and contact details.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-blue-600 text-lg text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <Badge variant="outline" className="mt-1 text-xs capitalize">
                {user?.role}
              </Badge>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                First Name
              </label>
              <Input
                value={profile.firstName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Last Name
              </label>
              <Input
                value={profile.lastName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, lastName: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Email Address
            </label>
            <Input value={profile.email} disabled className="bg-slate-50" />
            <p className="text-xs text-slate-400">
              Email cannot be changed. Contact support for assistance.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Phone Number
            </label>
            <Input
              value={profile.phone}
              onChange={(e) =>
                setProfile((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : profileSaved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Company</CardTitle>
              <CardDescription>
                Your organization details. Changes affect all team members.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Company Name
              </label>
              <Input
                value={company.name}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Company Type
              </label>
              <Input
                value={company.type}
                disabled
                className="bg-slate-50 capitalize"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Address
            </label>
            <Input
              value={company.address}
              onChange={(e) =>
                setCompany((c) => ({ ...c, address: e.target.value }))
              }
              placeholder="123 Maritime Drive, London, UK"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Phone
              </label>
              <Input
                value={company.phone}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, phone: e.target.value }))
                }
                placeholder="+44 20 7123 4567"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Website
              </label>
              <Input
                value={company.website}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, website: e.target.value }))
                }
                placeholder="https://company.com"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCompanySave}
              disabled={companySaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {companySaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : companySaved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>
                Choose what you want to be notified about.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "emailNewMessage" as const,
              label: "New messages",
              desc: "Receive an email when a new message is posted in your voyages.",
            },
            {
              key: "emailVoyageUpdate" as const,
              label: "Voyage status updates",
              desc: "Get notified when a voyage status changes.",
            },
            {
              key: "emailTermExtracted" as const,
              label: "Term extractions",
              desc: "Receive alerts when AI extracts new terms from messages.",
            },
            {
              key: "emailRecapGenerated" as const,
              label: "Recap generation",
              desc: "Get notified when a voyage recap is generated.",
            },
            {
              key: "pushEnabled" as const,
              label: "Push notifications",
              desc: "Enable browser push notifications for real-time updates.",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={notifPrefs[item.key]}
                onClick={() => toggleNotifPref(item.key)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  notifPrefs[item.key] ? "bg-blue-600" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                    notifPrefs[item.key]
                      ? "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleNotifSave}
              disabled={notifSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {notifSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : notifSaved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Integration */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
              <Mail className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Email Integration</CardTitle>
              <CardDescription>
                Connect your email to automatically import voyage
                correspondence.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 mb-4">
              <Mail className="h-7 w-7 text-violet-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              No email account connected
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Connect your work email to automatically import chartering
              correspondence and let AI extract voyage terms.
            </p>
            <Button variant="outline" className="mt-4">
              Connect Email Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
