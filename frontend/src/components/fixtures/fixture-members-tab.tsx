"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crown,
  Eye,
  Loader2,
  Mail,
  Phone,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { quintApi } from "@/lib/api";
import { mxcToMediaPath } from "@/lib/mxc-media";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface MemberRow {
  user_id: string;
  added_by: string | null;
  role: string;
  party: string | null;
  created_at: string | null;
  display_name?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface FixtureMembersTabProps {
  fixtureId: string;
}

interface MembersResponse {
  members: MemberRow[];
  source?: "explicit" | "room" | "none";
}

interface ChatPeer {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
}

function displayName(uid: string): string {
  return uid.replace(/^@/, "").split(":")[0] || uid;
}

function formatPhone(p: string | null): string {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1"))
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s()\-]{7,}$/;

function detectInputType(v: string): "email" | "phone" | "search" {
  const trimmed = v.trim();
  if (EMAIL_RE.test(trimmed)) return "email";
  if (PHONE_RE.test(trimmed)) return "phone";
  return "search";
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string; bg: string }> = {
  principal: { label: "Principal", icon: Crown, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  delegate: { label: "Delegate", icon: Shield, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  viewer: { label: "View Only", icon: Eye, color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
};

const PARTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  charterer: { label: "Charterer", color: "text-emerald-700", bg: "bg-emerald-50" },
  owner: { label: "Owner", color: "text-violet-700", bg: "bg-violet-50" },
  // Legacy API values (still grouped correctly if backend returns them)
  buyer: { label: "Charterer", color: "text-emerald-700", bg: "bg-emerald-50" },
  seller: { label: "Owner", color: "text-violet-700", bg: "bg-violet-50" },
};

export function FixtureMembersTab({ fixtureId }: FixtureMembersTabProps) {
  const { matrixUserId } = useAuthStore();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [source, setSource] = useState<string>("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [viewOnly, setViewOnly] = useState(true);

  const [input, setInput] = useState("");
  const [peers, setPeers] = useState<ChatPeer[]>([]);
  const [peersLoading, setPeersLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await quintApi.get<MembersResponse>(
        `/v1/fixtures/${fixtureId}/members`,
      );
      setMembers(res.members ?? []);
      setSource(res.source ?? "none");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    setPeersLoading(true);
    quintApi
      .get<{ peers: ChatPeer[] }>("/v1/fixtures/chat-peers")
      .then((res) => setPeers(res.peers ?? []))
      .catch(() => {})
      .finally(() => setPeersLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const memberIds = useMemo(
    () => new Set(members.map((m) => m.user_id)),
    [members],
  );

  const currentUserRole = useMemo(
    () => members.find((m) => m.user_id === matrixUserId),
    [members, matrixUserId],
  );
  const isPrincipal = currentUserRole?.role === "principal";

  const inputType = detectInputType(input);

  const filteredPeers = useMemo(() => {
    const q = input.trim().toLowerCase();
    const available = peers.filter((p) => !memberIds.has(p.user_id));
    if (!q) return available;
    return available.filter((p) => {
      const name = (p.display_name ?? displayName(p.user_id)).toLowerCase();
      const phone = (p.phone ?? "").toLowerCase();
      const email = (p.email ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [peers, input, memberIds]);

  const addMember = async (
    payload: { userId?: string; phone?: string; email?: string },
  ) => {
    setAdding(true);
    try {
      const res = await quintApi.post<MembersResponse>(
        `/v1/fixtures/${fixtureId}/members`,
        { ...payload, view_only: viewOnly },
      );
      setMembers(res.members ?? []);
      setSource(res.source ?? "explicit");
      setInput("");
      setDropdownOpen(false);
      toast.success("Member added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add member");
    } finally {
      setAdding(false);
    }
  };

  const handleSubmit = () => {
    const v = input.trim();
    if (!v) return;
    if (inputType === "email") {
      void addMember({ email: v });
    } else if (inputType === "phone") {
      void addMember({ phone: v });
    }
  };

  const handleRemoveOther = async (userId: string) => {
    setRemovingId(userId);
    try {
      const q = `?userId=${encodeURIComponent(userId)}`;
      const res = await quintApi.delete<MembersResponse>(
        `/v1/fixtures/${fixtureId}/members${q}`,
      );
      setMembers(res.members ?? []);
      setSource(res.source ?? "explicit");
      toast.success("Removed from fixture");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setRemovingId(null);
    }
  };

  const showSubmitButton = inputType === "email" || inputType === "phone";

  const chartererMembers = members.filter(
    (m) => m.party === "charterer" || m.party === "buyer",
  );
  const ownerMembers = members.filter(
    (m) => m.party === "owner" || m.party === "seller",
  );
  const unassigned = members.filter((m) => !m.party);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Fixture members
            </h2>
            <p className="text-sm text-slate-500">
              Principals are the original charterer and owner. Delegates can act on
              their team&apos;s behalf. Viewers have read-only access.
            </p>
          </div>
        </div>

        {/* Add member — only for principals */}
        {isPrincipal && (
          <div
            ref={wrapperRef}
            className="relative mb-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Add a member to your team
            </p>

            {/* View-only toggle */}
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewOnly(false)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  !viewOnly
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <Shield className="h-3.5 w-3.5" />
                Can act (delegate)
              </button>
              <button
                type="button"
                onClick={() => setViewOnly(true)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  viewOnly
                    ? "border-slate-300 bg-slate-100 text-slate-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                View only
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && showSubmitButton) {
                      e.preventDefault();
                      handleSubmit();
                    }
                    if (e.key === "Escape") {
                      setDropdownOpen(false);
                    }
                  }}
                  placeholder="Search contacts, or enter phone number / email…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200 transition-colors"
                />
              </div>
              {showSubmitButton && (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={adding || !input.trim()}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700"
                >
                  {adding ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {inputType === "phone" ? "Add by phone" : "Add by email"}
                </Button>
              )}
            </div>

            {input.trim() && showSubmitButton && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-blue-600">
                {inputType === "phone" ? (
                  <Phone className="h-3 w-3" />
                ) : (
                  <Mail className="h-3 w-3" />
                )}
                Press Enter or click Add to look up this{" "}
                {inputType === "phone" ? "phone number" : "email"}
              </p>
            )}

            {/* Contact dropdown */}
            {dropdownOpen && !showSubmitButton && (
              <div className="absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {peersLoading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading chat contacts…
                  </div>
                ) : filteredPeers.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">
                    {input.trim()
                      ? "No matching contacts — try entering a full phone number or email"
                      : peers.length === 0
                        ? "No chat contacts found"
                        : "All chat contacts are already members"}
                  </div>
                ) : (
                  <>
                    <div className="sticky top-0 border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      People you chat with
                    </div>
                    {filteredPeers.map((p) => (
                      <button
                        key={p.user_id}
                        type="button"
                        disabled={adding}
                        onClick={() => void addMember({ userId: p.user_id })}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-blue-50 disabled:opacity-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                          {(p.display_name || displayName(p.user_id))
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {p.display_name || displayName(p.user_id)}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            {p.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {formatPhone(p.phone)}
                              </span>
                            )}
                            {p.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                {p.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <UserPlus className="h-4 w-4 shrink-0 text-blue-500" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Members list */}
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading members…
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No members yet.
          </p>
        ) : (
          <div className="space-y-5">
            {chartererMembers.length > 0 && (
              <PartySection
                label="Charterer"
                members={chartererMembers}
                matrixUserId={matrixUserId}
                isPrincipal={isPrincipal}
                removingId={removingId}
                onRemove={handleRemoveOther}
              />
            )}
            {ownerMembers.length > 0 && (
              <PartySection
                label="Owner"
                members={ownerMembers}
                matrixUserId={matrixUserId}
                isPrincipal={isPrincipal}
                removingId={removingId}
                onRemove={handleRemoveOther}
              />
            )}
            {unassigned.length > 0 && (
              <PartySection
                label="Unassigned"
                members={unassigned}
                matrixUserId={matrixUserId}
                isPrincipal={isPrincipal}
                removingId={removingId}
                onRemove={handleRemoveOther}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PartySection({
  label,
  members,
  matrixUserId,
  isPrincipal,
  removingId,
  onRemove,
}: {
  label: string;
  members: MemberRow[];
  matrixUserId: string | null;
  isPrincipal: boolean;
  removingId: string | null;
  onRemove: (userId: string) => void;
}) {
  const party = PARTY_CONFIG[label.toLowerCase()];
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {party && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              party.bg,
              party.color,
            )}
          >
            {party.label}
          </span>
        )}
        {!party && (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </span>
        )}
        <span className="text-xs text-slate-400">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
        {members.map((m) => (
          <MemberRow
            key={m.user_id}
            member={m}
            matrixUserId={matrixUserId}
            isPrincipal={isPrincipal}
            removingId={removingId}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </div>
  );
}

function MemberRow({
  member: m,
  matrixUserId,
  isPrincipal,
  removingId,
  onRemove,
}: {
  member: MemberRow;
  matrixUserId: string | null;
  isPrincipal: boolean;
  removingId: string | null;
  onRemove: (userId: string) => void;
}) {
  const isSelf = matrixUserId && m.user_id === matrixUserId;
  const name = m.display_name || displayName(m.user_id);
  const phone = m.phone;
  const avatarSrc = mxcToMediaPath(m.avatar_url);
  const roleCfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.viewer;
  const RoleIcon = roleCfg.icon;
  const canRemove = isPrincipal && !isSelf && m.role !== "principal";

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {avatarSrc && <AvatarImage src={avatarSrc} alt="" />}
          <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {name}
            {isSelf && (
              <span className="ml-2 text-[10px] font-medium uppercase text-blue-600">
                (you)
              </span>
            )}
          </p>
          {phone ? (
            <p className="text-[12px] text-slate-500">
              {formatPhone(phone)}
            </p>
          ) : (
            <p className="font-mono text-[11px] text-slate-400 truncate">
              {m.user_id}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            roleCfg.bg,
            roleCfg.color,
          )}
        >
          <RoleIcon className="h-3 w-3" />
          {roleCfg.label}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-red-600 hover:bg-red-50"
            disabled={removingId === m.user_id}
            onClick={() => void onRemove(m.user_id)}
          >
            {removingId === m.user_id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <UserMinus className="mr-1 h-3.5 w-3.5" />
                Remove
              </>
            )}
          </Button>
        )}
      </div>
    </li>
  );
}
