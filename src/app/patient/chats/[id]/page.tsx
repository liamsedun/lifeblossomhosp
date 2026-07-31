"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, CheckCheck, Loader2, Send, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { chatTime, initials, roleLabel, useChatPresence, useChatRealtime } from "@/lib/chat";
import type { ChatMessage, ChatOtherUser, ChatWindowResponse } from "@/lib/api-types";

const QUICK_REPLIES = ["Thank you", "Noted", "Okay, noted", "I'll be there", "Thanks, doctor"];

function bubbleDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

export default function PatientChatWindowPage() {
  const params = useParams<{ id: string }>();
  const chatId = params.id;
  const { user } = useAuth();
  const online = useChatPresence(!!chatId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [other, setOther] = useState<ChatOtherUser | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  const markRead = useCallback(async () => {
    try {
      await fetch(`/api/chats/${chatId}/read`, { method: "POST" });
    } catch { /* ignore */ }
  }, [chatId]);

  const loadMessages = useCallback(async (before?: string) => {
    const url = before
      ? `/api/chats/${chatId}/messages?before=${encodeURIComponent(before)}&limit=20`
      : `/api/chats/${chatId}/messages?limit=20`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to load messages");
    return json.data as ChatWindowResponse;
  }, [chatId]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr(null);
      try {
        const data = await loadMessages();
        if (cancelled) return;
        setMessages(data.messages);
        setOther(data.other_user);
        setHasMore(data.has_more);
        scrollToBottom();
        markRead();
      } catch (e: any) {
        if (!cancelled) setLoadErr(e.message || "Could not load chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, loadMessages, markRead, scrollToBottom]);

  // Realtime: live incoming messages
  useChatRealtime(chatId, (msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      if (msg.sender_id === user?.id) {
        // Own message: realtime echoes our own insert — promote the optimistic
        // temp entry (same sender + content, sent moments ago) instead of
        // appending, so the message never renders twice.
        const tempIdx = prev.findIndex(
          (m) =>
            m.id.startsWith("temp-") &&
            m.sender_id === msg.sender_id &&
            m.message === msg.message &&
            Date.now() - new Date(m.created_at).getTime() < 10_000
        );
        if (tempIdx >= 0) {
          const next = [...prev];
          next[tempIdx] = { ...msg };
          return next;
        }
        // No optimistic match (e.g. sent from another tab) — append fresh.
        const next = [...prev, msg];
        if (next.length > 200) next.splice(0, next.length - 200);
        return next;
      }
      const next = [...prev, msg];
      if (next.length > 200) next.splice(0, next.length - 200);
      return next;
    });
    if (msg.sender_id !== user?.id) {
      markRead();
      scrollToBottom(true);
    }
  });

  // Fallback poll: if Realtime is unavailable (RLS/publication/plan limits),
  // this still picks up new messages so the chat never goes stale.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/chats/${chatId}/messages?limit=20`);
        const json = await res.json();
        if (!json.success) return;
        const server = json.data.messages as ChatMessage[];
        setMessages((prev) => {
          const merged = [...prev];
          for (const sm of server) {
            if (!merged.some((m) => m.id === sm.id)) merged.push(sm);
          }
          merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          if (merged.length > 200) merged.splice(0, merged.length - 200);
          return merged;
        });
      } catch { /* offline */ }
    }, 15_000);
    return () => clearInterval(id);
  }, [chatId]);

  const loadOlder = async () => {
    if (loadingOlderRef.current || !hasMore || messages.length === 0) return;
    loadingOlderRef.current = true;
    try {
      const data = await loadMessages(messages[0].created_at);
      setMessages((prev) => [...data.messages, ...prev].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i));
      setHasMore(data.has_more);
    } catch { /* ignore */ } finally {
      loadingOlderRef.current = false;
    }
  };

  const send = async (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content || sending) return;
    setSending(true);
    setShowQuick(false);
    setDraft("");

    // Optimistic append
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      sender_id: user?.id ?? "",
      message: content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom(true);

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...m, id: json.data.message.id, is_read: json.data.message.is_read } : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const otherName = other ? `${other.first_name} ${other.last_name}`.trim() : "Care team";
  const isOnline = online.has(other?.id ?? "");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-180px)] text-white/40">
        <Loader2 className="w-7 h-7 animate-spin mb-3" />
        <span className="text-sm">Loading conversation...</span>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-180px)] text-center">
        <p className="text-white/60 text-sm mb-3">{loadErr}</p>
        <Link href="/patient/chats" className="text-xs text-[#e0a84a] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to chats
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-150px)] -mx-4">
      {/* Window header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1322]/95 border-b border-white/[0.06] shrink-0">
        <Link href="/patient/chats" className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </Link>
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-[#1e3a5f] via-[#274b6d] to-[#3b6a8f] overflow-hidden">
            {other?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={other.avatar_url} alt={otherName} className="w-full h-full object-cover" />
            ) : (
              initials(other?.first_name, other?.last_name)
            )}
          </div>
          <span className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1322]", isOnline ? "bg-emerald-400" : "bg-white/20")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{otherName}</p>
          <p className="text-[11px] text-white/40">
            {isOnline ? (
              <span className="text-emerald-400">Online</span>
            ) : (
              roleLabel(other?.role)
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop < 40) loadOlder();
        }}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-white/[0.015]"
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <button onClick={loadOlder} className="text-[11px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
              <Loader2 className={cn("w-3 h-3", loadingOlderRef.current && "animate-spin")} /> Load earlier messages
            </button>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine = msg.sender_id === user?.id;
          const prev = messages[i - 1];
          const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
          const showTime = !prev || new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60_000;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center py-3">
                  <span className="text-[10px] text-white/35 bg-white/[0.05] border border-white/[0.06] px-3 py-1 rounded-full">
                    {bubbleDate(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5", mine ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-br-md" : "bg-[#1a2540] border border-white/[0.06] text-white/90 rounded-bl-md")}>
                  <p className="text-sm leading-snug whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className={cn("flex items-center justify-end gap-1 mt-1", mine ? "text-white/60" : "text-white/30")}>
                    <span className="text-[9px]">{chatTime(msg.created_at)}</span>
                    {mine && (msg.is_read ? <CheckCheck className="w-3 h-3 text-sky-300" /> : <Check className="w-3 h-3" />)}
                  </div>
                </div>
              </div>
              {showTime && !mine && i < messages.length - 1 && <div className="h-3" />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {showQuick && (
        <div className="px-4 py-2 bg-[#0d1322]/95 border-t border-white/[0.06] shrink-0 overflow-x-auto flex gap-2">
          {QUICK_REPLIES.map((r) => (
            <button
              key={r}
              onClick={() => send(r)}
              className="text-xs text-white/80 bg-white/[0.06] border border-white/[0.08] rounded-full px-3 py-1.5 whitespace-nowrap hover:bg-white/[0.1] transition-colors"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1322]/95 border-t border-white/[0.06] shrink-0">
        <button
          onClick={() => setShowQuick(!showQuick)}
          className={cn("p-2 rounded-xl transition-colors", showQuick ? "bg-[#e0a84a]/20 text-[#e0a84a]" : "text-white/50 hover:bg-white/[0.06]")}
          title="Quick replies"
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Type a message..."
          className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e0a84a]/40 transition-colors"
        />
        <button
          onClick={() => send()}
          disabled={!draft.trim() || sending}
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#e0a84a] to-amber-500 text-[#0a0f1a] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
