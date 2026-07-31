"use client";

import { useState, useEffect } from "react";
import {
  Mail, MailOpen, Inbox, Trash2, Loader2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Sender {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

interface MailMessage {
  id: string;
  subject: string;
  body: string;
  is_broadcast: boolean;
  broadcast_scope: string | null;
  created_at: string;
  sender: Sender | null;
  is_read: boolean;
  recipient_row_id: string;
}

export default function PatientInternalMailPage() {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMsg, setOpenMsg] = useState<MailMessage | null>(null);

  const loadMail = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/internal-mail/inbox?page_size=100");
      const j = await r.json();
      if (j.success) setMessages(j.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadMail(); }, []);

  const openMessage = (msg: MailMessage) => {
    setOpenMsg(msg);
    if (!msg.is_read && msg.recipient_row_id) {
      fetch(`/api/internal-mail/read/${msg.recipient_row_id}`, { method: "PUT" }).catch(() => {});
      msg.is_read = true;
    }
  };

  const handleDelete = async (msg: MailMessage) => {
    if (!confirm("Delete this message?")) return;
    try {
      const r = await fetch(`/api/internal-mail/${msg.recipient_row_id}?view=inbox`, { method: "DELETE" });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "Delete failed");
      setMessages((prev) => prev.filter((m) => m.recipient_row_id !== msg.recipient_row_id));
      if (openMsg?.recipient_row_id === msg.recipient_row_id) setOpenMsg(null);
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  };

  const timeAgo = (t: string) => {
    const diff = Date.now() - new Date(t).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Mail className="size-5 text-[#e0a84a]" /> Messages
        </h1>
        <p className="text-sm text-white/50 mt-0.5">Messages from your hospital</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-white/40 rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <MailOpen className="size-10 mb-3" />
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden divide-y divide-white/[0.04]">
          {messages.map((msg) => (
            <div key={msg.recipient_row_id} className="flex items-center">
              <button
                onClick={() => openMessage(msg)}
                className="flex-1 min-w-0 text-left px-4 py-3.5 active:bg-white/[0.03] transition-colors flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0">
                  {msg.is_read ? (
                    <MailOpen className="size-4 text-white/30" />
                  ) : (
                    <Mail className="size-4 text-[#e0a84a]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-sm truncate", msg.is_read ? "text-white/70" : "text-white font-semibold")}>
                      {msg.subject}
                    </p>
                    <span className="text-[10px] text-white/30 shrink-0">{timeAgo(msg.created_at)}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{msg.body}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-white/30">
                      From: {msg.sender?.full_name || "Hospital"}
                    </span>
                    {msg.is_broadcast && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#e0a84a]/30 text-[#e0a84a] bg-[#e0a84a]/5">
                        Announcement
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/20 shrink-0 mt-1.5" />
              </button>
              <button
                onClick={() => handleDelete(msg)}
                title="Delete"
                className="mr-3 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {openMsg && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenMsg(null)} />
          <div className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/[0.08] bg-[#0d1322] p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{openMsg.subject}</h2>
                <p className="text-xs text-white/50 mt-0.5">
                  From: {openMsg.sender?.full_name || "Hospital"} · {timeAgo(openMsg.created_at)}
                </p>
              </div>
              <button
                onClick={() => setOpenMsg(null)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06]"
              >
                <Inbox className="size-4" />
              </button>
            </div>
            <div className="mt-4 text-sm text-white/80 whitespace-pre-wrap leading-relaxed border-t border-white/[0.06] pt-4">
              {openMsg.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
