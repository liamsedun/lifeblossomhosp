"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, MailOpen, Inbox, Trash2, Loader2, ChevronRight, Send,
  Search, X, Reply, AlertCircle, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  recipient_count?: number;
}

interface StaffUser {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

export default function PatientInternalMailPage() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [sentMsgs, setSentMsgs] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMsg, setOpenMsg] = useState<MailMessage | null>(null);

  // Compose
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [toRecipients, setToRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [toSearch, setToSearch] = useState("");
  const [ccSearch, setCcSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const loadMail = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/internal-mail/inbox?page_size=100");
      const j = await r.json();
      if (j.success) setMessages(j.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadSent = useCallback(async () => {
    try {
      const r = await fetch("/api/internal-mail/sent?page_size=100");
      const j = await r.json();
      if (j.success) setSentMsgs(j.data || []);
    } catch {}
  }, []);

  useEffect(() => { loadMail(); loadSent(); }, [loadMail, loadSent]);

  useEffect(() => {
    fetch("/api/internal-mail/recipients")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setStaffList((j.data?.staff || []).map((u: any) => ({
            ...u,
            full_name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Unknown",
          })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "inbox") loadMail();
    if (activeTab === "sent") loadSent();
  }, [activeTab, loadMail, loadSent]);

  const openMessage = (msg: MailMessage) => {
    setOpenMsg(msg);
    if (!msg.is_read && msg.recipient_row_id) {
      fetch(`/api/internal-mail/read/${msg.recipient_row_id}`, { method: "PUT" }).catch(() => {});
      msg.is_read = true;
    }
  };

  const handleDelete = async (msg: MailMessage, view: "inbox" | "sent") => {
    if (!confirm(view === "inbox" ? "Delete this message from your inbox?" : "Delete this sent message?")) return;
    try {
      const id = view === "inbox" ? msg.recipient_row_id || msg.id : msg.id;
      const r = await fetch(`/api/internal-mail/${id}?view=${view}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "Delete failed");
      if (view === "inbox") {
        setMessages((prev) => prev.filter((m) => m.recipient_row_id !== msg.recipient_row_id));
        if (openMsg?.recipient_row_id === msg.recipient_row_id) setOpenMsg(null);
      } else {
        setSentMsgs((prev) => prev.filter((m) => m.id !== msg.id));
        if (openMsg?.id === msg.id) setOpenMsg(null);
      }
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  };

  const toggleTo = (uid: string) => {
    setToRecipients((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  };

  const toggleCc = (uid: string) => {
    setCcRecipients((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  };

  const handleSend = async () => {
    if (!toRecipients.length) { setSendError("Add at least one recipient in TO"); return; }
    if (!subject.trim() || !body.trim()) { setSendError("Subject and message are required"); return; }
    setSending(true);
    setSendError("");
    try {
      const r = await fetch("/api/internal-mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_ids: toRecipients,
          cc_ids: ccRecipients.filter((id) => !toRecipients.includes(id)),
          broadcast: false,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const j = await r.json();
      if (j.success) {
        setToRecipients([]);
        setCcRecipients([]);
        setToSearch("");
        setCcSearch("");
        setSubject("");
        setBody("");
        loadSent();
        setActiveTab("sent");
      } else {
        setSendError(j.error || "Failed to send");
      }
    } catch {
      setSendError("Network error");
    } finally {
      setSending(false);
    }
  };

  const startReply = (msg: MailMessage) => {
    if (!msg.sender) return;
    setToRecipients([msg.sender.id]);
    setCcRecipients([]);
    setToSearch("");
    setCcSearch("");
    setSubject(msg.subject.toLowerCase().startsWith("re:") ? msg.subject : `Re: ${msg.subject}`);
    setBody(
      `\n\n----- Original message -----\n` +
      `From: ${msg.sender.full_name || "Hospital"}\n` +
      `Subject: ${msg.subject}\n` +
      `${msg.body}`
    );
    setSendError("");
    setOpenMsg(null);
    setActiveTab("compose");
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

  const renderRow = (s: StaffUser, selected: string[], onToggle: (id: string) => void) => (
    <label key={s.id}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.04] cursor-pointer">
      <input type="checkbox" checked={selected.includes(s.id)}
        onChange={() => onToggle(s.id)}
        className="accent-[#e0a84a]" />
      <Avatar className="size-6">
        <AvatarImage src={s.avatar_url || undefined} />
        <AvatarFallback className="text-[9px] bg-white/[0.06] text-white/60">
          {s.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80 truncate">{s.full_name}</p>
        <p className="text-[10px] text-white/40 capitalize">{s.role?.replace("_", " ")}</p>
      </div>
    </label>
  );

  const RecipientPicker = ({
    search, onSearch, selected, onToggle, chips,
  }: {
    search: string;
    onSearch: (v: string) => void;
    selected: string[];
    onToggle: (id: string) => void;
    chips: StaffUser[];
  }) => {
    const q = search.toLowerCase();
    const staff = staffList.filter(
      (s) => (s.full_name || "").toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q)
    );
    return (
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="Search recipients by name..."
            className="pl-9 h-9 text-sm border-white/[0.08] bg-white/[0.03] text-white/90 placeholder:text-white/30" />
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map((s) => (
              <span key={s.id}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-[11px] text-white/80 bg-[#e0a84a]/10 border border-[#e0a84a]/25">
                {s.full_name}
                <button type="button" onClick={() => onToggle(s.id)}
                  className="p-0.5 rounded-full text-white/50 hover:text-white hover:bg-white/[0.08]">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="max-h-48 overflow-y-auto border border-white/[0.06] rounded-lg p-2 space-y-1 mt-2">
          {staff.length === 0 ? (
            <p className="text-xs text-white/30 p-2">No recipients found</p>
          ) : staff.map((s) => renderRow(s, selected, onToggle))}
        </div>
      </div>
    );
  };

  const inputClass = "h-9 text-sm border-white/[0.08] bg-white/[0.03] text-white/90 placeholder:text-white/30";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="size-5 text-[#e0a84a]" /> Messages
          </h1>
          <p className="text-sm text-white/50 mt-0.5">Your hospital mailbox</p>
        </div>
        <Button onClick={() => setActiveTab("compose")}
          className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20 gap-2 h-9">
          <MessageSquare className="size-4" /> Compose
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-white/[0.06] bg-white/[0.03]">
          <TabsTrigger value="inbox" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/[0.06] gap-2">
            <Inbox className="size-4" /> Inbox
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/[0.06] gap-2">
            <Send className="size-4" /> Sent
          </TabsTrigger>
          <TabsTrigger value="compose" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/[0.06] gap-2">
            <MessageSquare className="size-4" /> Compose
          </TabsTrigger>
        </TabsList>

        {/* ──────── Inbox ──────── */}
        <TabsContent value="inbox" className="mt-3">
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
                    onClick={() => handleDelete(msg, "inbox")}
                    title="Delete from inbox"
                    className="mr-3 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ──────── Sent ──────── */}
        <TabsContent value="sent" className="mt-3">
          {sentMsgs.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-white/40 rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <Send className="size-10 mb-3" />
              <p className="text-sm">No sent messages yet</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden divide-y divide-white/[0.04]">
              {sentMsgs.map((msg) => (
                <div key={msg.id} className="flex items-center">
                  <button
                    onClick={() => openMessage(msg)}
                    className="flex-1 min-w-0 text-left px-4 py-3.5 active:bg-white/[0.03] transition-colors flex items-start gap-3"
                  >
                    <div className="mt-0.5 shrink-0">
                      <Send className="size-4 text-white/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white font-medium truncate">{msg.subject}</p>
                        <span className="text-[10px] text-white/30 shrink-0">{timeAgo(msg.created_at)}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{msg.body}</p>
                      <p className="text-[10px] text-white/30 mt-1">
                        {msg.recipient_count ?? 0} recipient{(msg.recipient_count ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-white/20 shrink-0 mt-1.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(msg, "sent")}
                    title="Delete sent message"
                    className="mr-3 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ──────── Compose ──────── */}
        <TabsContent value="compose" className="mt-3">
          <Card className="border-white/[0.06] bg-white/[0.03]">
            <div className="p-4 space-y-4">
              <p className="text-sm font-medium text-white/80">Compose Message</p>

              <div>
                <label className="text-xs text-white/60 mb-1.5 block">TO:</label>
                <RecipientPicker
                  search={toSearch}
                  onSearch={setToSearch}
                  selected={toRecipients}
                  onToggle={toggleTo}
                  chips={staffList.filter((s) => toRecipients.includes(s.id))}
                />
                {toRecipients.length > 0 && (
                  <p className="text-[10px] text-[#e0a84a] mt-1">{toRecipients.length} recipient(s) in TO</p>
                )}
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1.5 block">CC:</label>
                <RecipientPicker
                  search={ccSearch}
                  onSearch={setCcSearch}
                  selected={ccRecipients}
                  onToggle={toggleCc}
                  chips={staffList.filter((s) => ccRecipients.includes(s.id))}
                />
              </div>

              <div>
                <label htmlFor="subject" className="text-xs text-white/60 mb-1.5 block">Subject</label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Message subject..." className={inputClass} />
              </div>

              <div>
                <label htmlFor="body" className="text-xs text-white/60 mb-1.5 block">Message</label>
                <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message..."
                  rows={7}
                  className="border-white/[0.08] bg-white/[0.03] text-white/90 placeholder:text-white/30 text-sm" />
              </div>

              {sendError && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  <AlertCircle className="size-3.5 mt-0.5 shrink-0" /> {sendError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setActiveTab("inbox"); setSendError(""); }}
                  className="bg-white text-black border-border hover:bg-gray-100">
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={sending}
                  className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20 gap-2">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ──────── Message Detail ──────── */}
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
            <div className="flex justify-between gap-2 mt-5">
              <Button onClick={() => startReply(openMsg)}
                className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20 gap-2">
                <Reply className="size-4" /> Reply
              </Button>
              <Button variant="outline" onClick={() => setOpenMsg(null)}
                className="bg-white text-black border-border hover:bg-gray-100">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
