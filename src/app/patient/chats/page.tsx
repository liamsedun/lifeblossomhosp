"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MessageCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { chatListTime, initials, roleLabel, roleTagClass, useChatPresence, useInboxRealtime } from "@/lib/chat";
import type { ChatDirectoryEntry, ChatListResponse } from "@/lib/api-types";

function Avatar({ name, online, ring }: { name: string; online?: boolean; ring?: boolean }) {
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white",
          "bg-gradient-to-br from-[#1e3a5f] via-[#274b6d] to-[#3b6a8f]",
          ring && "ring-2 ring-[#e0a84a]/40"
        )}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d1322]",
          online ? "bg-emerald-400" : "bg-white/20"
        )}
      />
    </div>
  );
}

export default function PatientChatsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<ChatListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<string | null>(null);

  const online = useChatPresence(true);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/chats");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: live badge/preview updates (toast is handled by the layout)
  useInboxRealtime(!!data, (ev) => {
    if (!data) return;
    if (ev.sender_id === user?.id) return;
    const chat = data.chats.find((c) => c.id === ev.chat_id);
    if (!chat) {
      load(true);
      return;
    }
    setData((prev) =>
      prev
        ? {
            ...prev,
            chats: prev.chats
              .map((c) =>
                c.id === ev.chat_id
                  ? {
                      ...c,
                      last_message: ev.message,
                      last_sender_id: ev.sender_id,
                      last_message_at: ev.created_at,
                      updated_at: ev.created_at,
                      unread_count: c.unread_count + 1,
                    }
                  : c
              )
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
          }
        : prev
    );
  });

  const startChat = async (staffId: string) => {
    if (creating) return;
    setCreating(staffId);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_user_id: staffId }),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/patient/chats/${json.data.chat.id}`);
        return;
      }
    } catch { /* network error */ } finally {
      setCreating(null);
    }
  };

  const chats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.chats ?? [];
    return (data?.chats ?? []).filter((c) => {
      const name = `${c.other_user?.first_name ?? ""} ${c.other_user?.last_name ?? ""}`.toLowerCase();
      const role = roleLabel(c.other_user?.role).toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [data, search]);

  const directory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const existingStaff = new Set((data?.chats ?? []).map((c) => c.staff_user_id));
    let list = (data?.directory ?? []).filter((d) => !existingStaff.has(d.id));
    if (q) {
      list = list.filter((d) =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) || roleLabel(d.role).toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search]);

  const totalUnread = useMemo(
    () => (data?.chats ?? []).reduce((acc, c) => acc + c.unread_count, 0),
    [data]
  );

  return (
    <div className="min-h-[calc(100dvh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Chats</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? "s" : ""}` : "Message our care team"}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#e0a84a]/10 border border-[#e0a84a]/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-[#e0a84a]" />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff or chats..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e0a84a]/40 transition-colors"
        />
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <Loader2 className="w-7 h-7 animate-spin mb-3" />
          <span className="text-sm">Loading chats...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active chats */}
          {chats.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[11px] uppercase tracking-wider text-white/30 font-semibold px-1">Conversations</h2>
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/patient/chats/${chat.id}`}
                  className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 hover:bg-white/[0.06] transition-colors"
                >
                  <Avatar name={chat.other_user ? `${chat.other_user.first_name} ${chat.other_user.last_name}` : "?"} online={online.has(chat.other_user?.id ?? "")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {chat.other_user ? `${chat.other_user.first_name} ${chat.other_user.last_name}` : "Staff"}
                      </span>
                      <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border", roleTagClass(chat.other_user?.role))}>
                        {roleLabel(chat.other_user?.role)}
                      </span>
                    </div>
                    <p className={cn("text-xs truncate mt-0.5", chat.unread_count > 0 ? "text-white/80 font-medium" : "text-white/40")}>
                      {chat.last_sender_id === user?.id ? "You: " : ""}
                      {chat.last_message || "Say hello 👋"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] text-white/30">{chat.last_message_at ? chatListTime(chat.last_message_at) : ""}</span>
                    {chat.unread_count > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-br from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-[10px] font-bold rounded-full px-1 leading-none">
                        {chat.unread_count > 9 ? "9+" : chat.unread_count}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Staff directory — start a new chat */}
          {directory.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[11px] uppercase tracking-wider text-white/30 font-semibold px-1">Care team</h2>
              <div className="space-y-2">
                {directory.map((staff: ChatDirectoryEntry) => (
                  <button
                    key={staff.id}
                    onClick={() => startChat(staff.id)}
                    disabled={creating === staff.id}
                    className="w-full flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 hover:bg-white/[0.06] transition-colors text-left disabled:opacity-60"
                  >
                    <Avatar name={`${staff.first_name} ${staff.last_name}`} online={online.has(staff.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {staff.first_name} {staff.last_name}
                        </span>
                        <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border", roleTagClass(staff.role))}>
                          {roleLabel(staff.role)}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 truncate mt-0.5">
                        {staff.specialization || "Available for chat"}
                      </p>
                    </div>
                    {creating === staff.id ? (
                      <Loader2 className="w-4 h-4 text-[#e0a84a] animate-spin shrink-0" />
                    ) : (
                      <span className="text-[#e0a84a] text-xs font-medium shrink-0">Chat</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {chats.length === 0 && directory.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#e0a84a]/10 border border-[#e0a84a]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-[#e0a84a]" />
              </div>
              <h3 className="text-white font-semibold">{search ? "No results found" : "No chats yet"}</h3>
              <p className="text-sm text-white/40 mt-1 max-w-[240px]">
                {search ? "Try a different name or role." : "Tap a member of the care team above to start a conversation."}
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 text-xs text-[#e0a84a] flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Clear search
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
