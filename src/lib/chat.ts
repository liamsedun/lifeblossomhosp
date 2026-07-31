"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/api-types";

// ─── Formatting helpers ──────────────────────────────────────────

export function chatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hhmm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return hhmm;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function chatListTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function initials(first?: string | null, last?: string | null): string {
  return `${(first || "?").charAt(0)}${(last || "?").charAt(0)}`.toUpperCase();
}

export function roleLabel(role?: string | null): string {
  switch (role) {
    case "doctor": return "Doctor";
    case "nurse": return "Nurse";
    case "admin": return "Admin";
    case "accountant": return "Accountant";
    case "super_admin": return "Super Admin";
    case "patient": return "Patient";
    default: return role || "Staff";
  }
}

export function roleTagClass(role?: string | null): string {
  switch (role) {
    case "doctor": return "bg-sky-500/15 text-sky-300 border-sky-400/20";
    case "nurse": return "bg-rose-500/15 text-rose-300 border-rose-400/20";
    case "admin": case "super_admin": return "bg-violet-500/15 text-violet-300 border-violet-400/20";
    case "accountant": return "bg-amber-500/15 text-amber-300 border-amber-400/20";
    default: return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
  }
}

// ─── Presence: heartbeat + online set ────────────────────────────

export function useChatPresence(enabled = true) {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    let heartbeat: ReturnType<typeof setInterval>;
    const supabase = createClient();

    const ping = async () => {
      try {
        const res = await fetch("/api/chat-presence", { method: "POST" });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.online) {
            const list = await fetch("/api/chat-presence").then((r) => r.json());
            setOnline(new Set((list.data?.online ?? []) as string[]));
          }
        }
      } catch { /* offline */ }
    };

    ping();
    heartbeat = setInterval(ping, 30_000);

    // Live presence updates via Realtime
    const channel = supabase
      .channel("chat-presence")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_presence" },
        () => {
          fetch("/api/chat-presence")
            .then((r) => r.json())
            .then((json) => setOnline(new Set((json.data?.online ?? []) as string[])))
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return online;
}

// ─── Realtime: new messages for a chat ───────────────────────────

export function useChatRealtime(chatId: string | null, onNewMessage: (msg: ChatMessage) => void) {
  const handlerRef = useRef(onNewMessage);
  handlerRef.current = onNewMessage;

  useEffect(() => {
    if (!chatId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg && msg.sender_id) handlerRef.current(msg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);
}

// ─── Realtime: any new message (inbox badge / toasts) ────────────

export interface InboxEvent {
  chat_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export function useInboxRealtime(enabled: boolean, onEvent: (ev: InboxEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();

    const channel = supabase
      .channel("chat-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          handlerRef.current({
            chat_id: String(row.chat_id ?? ""),
            sender_id: String(row.sender_id ?? ""),
            message: String(row.message ?? ""),
            created_at: String(row.created_at ?? new Date().toISOString()),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
