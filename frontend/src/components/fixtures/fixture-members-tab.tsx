"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus, UserMinus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { quintApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MemberRow {
  user_id: string;
  added_by: string | null;
  created_at: string | null;
}

interface FixtureMembersTabProps {
  fixtureId: string;
}

interface MembersResponse {
  members: MemberRow[];
  source?: "explicit" | "room" | "none";
}

export function FixtureMembersTab({ fixtureId }: FixtureMembersTabProps) {
  const { matrixUserId } = useAuthStore();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [source, setSource] = useState<string>("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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

    const handleAdd = async () => {
    const uid = addUserId.trim();
    if (!uid) return;
    setAdding(true);
    try {
      const res = await quintApi.post<MembersResponse>(
        `/v1/fixtures/${fixtureId}/members`,
        { userId: uid },
      );
      setMembers(res.members ?? []);
      setSource(res.source ?? "explicit");
      setAddUserId("");
      toast.success("Member added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add member");
    } finally {
      setAdding(false);
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-6 flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fixture members</h2>
          <p className="text-sm text-slate-500">
            People who can see this fixture. Add someone who is already in the
            chat room (same Matrix ID as in the room).
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-xs font-medium text-slate-500" htmlFor="add-member-id">
            Matrix user ID
          </label>
          <Input
            id="add-member-id"
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
            placeholder="@user:server.com"
            className="font-mono text-sm"
          />
        </div>
        <Button
          type="button"
          onClick={() => void handleAdd()}
          disabled={adding || !addUserId.trim()}
          className="shrink-0 bg-blue-600 hover:bg-blue-700"
        >
          {adding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Add member
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading members…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No members found. Add someone from the chat room above.
        </p>
      ) : (
        <>
          {source === "room" && (
            <p className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Showing all chat room members. Add someone explicitly above to
              create a members list for this fixture.
            </p>
          )}
          <div className="mb-2 text-xs font-medium text-slate-500">
            {members.length} {members.length === 1 ? "member" : "members"}
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {members.map((m) => {
              const isSelf = matrixUserId && m.user_id === matrixUserId;
              return (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {(m.user_id.replace(/^@/, "").split(":")[0] || "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {m.user_id.replace(/^@/, "").split(":")[0]}
                        {isSelf && (
                          <span className="ml-2 text-[10px] font-medium uppercase text-blue-600">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400 truncate">
                        {m.user_id}
                      </p>
                      {m.created_at && (
                        <p className="text-[10px] text-slate-400">
                          Added {new Date(m.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {source === "explicit" && !isSelf && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-red-600 hover:bg-red-50"
                      disabled={removingId === m.user_id}
                      onClick={() => void handleRemoveOther(m.user_id)}
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
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
