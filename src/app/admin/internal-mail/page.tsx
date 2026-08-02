"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, MailOpen, Send, ReplyAll, Users, UserPlus, Loader2, ChevronDown,
  CheckCheck, MessageSquare, Inbox, Clock, AlertCircle, X, Trash2, Search, Reply,
} from "lucide-react";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";

interface StaffUser {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

interface InternalMessage {
  id: string;
  subject: string;
  body: string;
  is_broadcast: boolean;
  broadcast_scope: string | null;
  created_at: string;
  sender_id: string;
  sender: StaffUser | null;
  is_read?: boolean;
  recipient_row_id?: string;
  recipient_id?: string;
  recipient_count?: number;
}

function RecipientPicker({
  search,
  onSearch,
  selected,
  onToggle,
  staffList,
  patientList,
  placeholder,
}: {
  search: string;
  onSearch: (v: string) => void;
  selected: string[];
  onToggle: (id: string) => void;
  staffList: StaffUser[];
  patientList?: StaffUser[];
  placeholder?: string;
}) {
  const q = search.toLowerCase();
  const staff = staffList.filter(
    (s) => s.full_name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
  );
  const patients = (patientList || []).filter((s) => s.full_name.toLowerCase().includes(q));
  const all = [...staffList, ...(patientList || [])];
  const chips = all.filter((s) => selected.includes(s.id));

  const renderRow = (s: StaffUser, tag?: string) => (
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
        <p className="text-[10px] text-white/40 capitalize">{tag || s.role?.replace("_", " ")}</p>
      </div>
    </label>
  );

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder || "Search recipients..."}
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
        {staff.length === 0 && patients.length === 0 ? (
          <p className="text-xs text-white/30 p-2">No recipients found</p>
        ) : (
          <>
            {staff.length > 0 && (
              <p className="text-[10px] text-white/40 uppercase tracking-wider px-2 pt-1">Staff</p>
            )}
            {staff.map((s) => renderRow(s))}
            {patients.length > 0 && (
              <p className="text-[10px] text-white/40 uppercase tracking-wider px-2 pt-2">Patients</p>
            )}
            {patients.map((s) => renderRow(s, "Patient"))}
          </>
        )}
      </div>
    </div>
  );
}

export default function InternalMailPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inbox");
  const [inboxMsgs, setInboxMsgs] = useState<InternalMessage[]>([]);
  const [sentMsgs, setSentMsgs] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [recipientType, setRecipientType] = useState<"individual" | "staff" | "all">("individual");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [patientList, setPatientList] = useState<StaffUser[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [ccSearch, setCcSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // Detail view
  const [selectedMsg, setSelectedMsg] = useState<InternalMessage | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const router = useRouter();

  const loadInbox = async () => {
    try {
      const r = await fetch("/api/internal-mail/inbox");
      const j = await r.json();
      if (j.success) setInboxMsgs(j.data || []);
    } catch {}
  };

  const loadSent = async () => {
    try {
      const r = await fetch("/api/internal-mail/sent");
      const j = await r.json();
      if (j.success) setSentMsgs(j.data || []);
    } catch {}
  };

  const loadStaff = async () => {
    try {
      const r = await fetch("/api/internal-mail/recipients");
      const j = await r.json();
      if (j.success) {
        setStaffList(j.data?.staff || []);
        setPatientList(j.data?.patients || []);
      }
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadInbox(), loadSent(), loadStaff()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "inbox") loadInbox();
    if (activeTab === "sent") loadSent();
  }, [activeTab]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setSendError("");

    const payload: any = { subject: subject.trim(), body: body.trim() };

    if (recipientType === "individual") {
      if (!selectedRecipients.length) { setSendError("Select at least one recipient"); setSending(false); return; }
      payload.recipient_ids = selectedRecipients;
      payload.cc_ids = ccRecipients.filter((id) => !selectedRecipients.includes(id));
      payload.broadcast = false;
    } else {
      payload.broadcast = true;
      payload.broadcast_scope = recipientType;
    }

    try {
      const r = await fetch("/api/internal-mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.success) {
        setSubject("");
        setBody("");
        setSelectedRecipients([]);
        setCcRecipients([]);
        setRecipientSearch("");
        setCcSearch("");
        setRecipientType("individual");
        setActiveTab("inbox");
        loadInbox();
      } else {
        setSendError(j.error || "Failed to send");
      }
    } catch {
      setSendError("Network error");
    } finally {
      setSending(false);
    }
  };

  const openDetail = (msg: InternalMessage) => {
    setSelectedMsg(msg);
    setDetailOpen(true);
    if (msg.recipient_row_id && !msg.is_read) {
      fetch(`/api/internal-mail/read/${msg.recipient_row_id}`, { method: "PUT" }).catch(() => {});
      msg.is_read = true;
    }
  };

  const handleDelete = async (msg: InternalMessage, view: "inbox" | "sent") => {
    if (!confirm(`Delete this message from your ${view}?`)) return;
    try {
      const id = view === "inbox" ? msg.recipient_row_id || msg.id : msg.id;
      const r = await fetch(`/api/internal-mail/${id}?view=${view}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "Delete failed");
      if (view === "inbox") loadInbox();
      else loadSent();
      if (selectedMsg?.id === msg.id) setDetailOpen(false);
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  };

  const toggleRecipient = (uid: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleCc = (uid: string) => {
    setCcRecipients((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const startReply = (msg: InternalMessage) => {
    if (!msg.sender) return;
    setRecipientType("individual");
    setSelectedRecipients([msg.sender.id]);
    setCcRecipients([]);
    setRecipientSearch("");
    setCcSearch("");
    setSubject(msg.subject.toLowerCase().startsWith("re:") ? msg.subject : `Re: ${msg.subject}`);
    setBody(
      `\n\n----- Original message -----\n` +
      `From: ${msg.sender.full_name}\n` +
      `Subject: ${msg.subject}\n` +
      `${msg.body}`
    );
    setSendError("");
    setDetailOpen(false);
    setActiveTab("compose");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Internal Mail</h1>
          <p className="text-sm text-white/50 mt-1">Send and receive messages with staff</p>
        </div>
        <Button onClick={() => setActiveTab("compose")}
          className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20 gap-2">
          <MessageSquare className="size-4" /> Compose
        </Button>
      </div>

      {/* Tabs */}
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
        <TabsContent value="inbox" className="mt-4">
          <Card className="border-white/[0.06] bg-[#0d1322]/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/80">Inbox</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 text-white/40 animate-spin" />
                </div>
              ) : inboxMsgs.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-white/40">
                  <MailOpen className="size-10 mb-3" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {inboxMsgs.map((msg) => (
                    <div key={msg.recipient_row_id || msg.id} className="group flex items-center">
                      <button
                        onClick={() => openDetail(msg)}
                        className="flex-1 min-w-0 text-left px-4 py-3 hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {msg.is_read ? (
                              <MailOpen className="size-4 text-white/30" />
                            ) : (
                              <Mail className="size-4 text-[#e0a84a]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn("text-sm truncate", msg.is_read ? "text-white/70" : "text-white font-medium")}>
                                {msg.subject}
                              </p>
                              <span className="text-[10px] text-white/30 shrink-0">{formatDate(msg.created_at)}</span>
                            </div>
                            <p className="text-xs text-white/40 mt-0.5 truncate">{msg.body}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-white/30">
                                From: {msg.sender?.full_name || "Unknown"}
                              </span>
                              {msg.is_broadcast && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#e0a84a]/30 text-[#e0a84a] bg-[#e0a84a]/5">
                                  <ReplyAll className="size-2.5 mr-1" /> Broadcast
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(msg, "inbox"); }}
                        title="Delete from inbox"
                        className="mr-3 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── Sent ──────── */}
        <TabsContent value="sent" className="mt-4">
          <Card className="border-white/[0.06] bg-[#0d1322]/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/80">Sent Messages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 text-white/40 animate-spin" />
                </div>
              ) : sentMsgs.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-white/40">
                  <Send className="size-10 mb-3" />
                  <p className="text-sm">No sent messages yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {sentMsgs.map((msg) => (
                    <div key={msg.id} className="group flex items-center">
                      <button
                        onClick={() => openDetail(msg)}
                        className="flex-1 min-w-0 text-left px-4 py-3 hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <Send className="size-4 text-white/30" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-white font-medium truncate">{msg.subject}</p>
                              <span className="text-[10px] text-white/30 shrink-0">{formatDate(msg.created_at)}</span>
                            </div>
                            <p className="text-xs text-white/40 mt-0.5 truncate">{msg.body}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {msg.is_broadcast ? (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#e0a84a]/30 text-[#e0a84a] bg-[#e0a84a]/5">
                                  <ReplyAll className="size-2.5 mr-1" />
                                  Broadcast to {msg.broadcast_scope === "all" ? "All" : "Staff"}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-white/30">
                                  {msg.recipient_count ?? 0} recipient{(msg.recipient_count ?? 0) !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(msg, "sent"); }}
                        title="Delete message"
                        className="mr-3 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── Compose ──────── */}
        <TabsContent value="compose" className="mt-4">
          <Card className="border-white/[0.06] bg-[#0d1322]/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/80">Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Recipient Type */}
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Send To</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRecipientType("individual")}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors",
                      recipientType === "individual"
                        ? "border-[#e0a84a]/50 bg-[#e0a84a]/10 text-[#e0a84a]"
                        : "border-white/[0.08] text-white/50 hover:border-white/[0.15]"
                    )}>
                    <UserPlus className="size-3.5" /> Individual
                  </button>
                  <button type="button" onClick={() => setRecipientType("staff")}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors",
                      recipientType === "staff"
                        ? "border-[#e0a84a]/50 bg-[#e0a84a]/10 text-[#e0a84a]"
                        : "border-white/[0.08] text-white/50 hover:border-white/[0.15]"
                    )}>
                    <Users className="size-3.5" /> All Staff
                  </button>
                  <button type="button" onClick={() => setRecipientType("all")}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors",
                      recipientType === "all"
                        ? "border-[#e0a84a]/50 bg-[#e0a84a]/10 text-[#e0a84a]"
                        : "border-white/[0.08] text-white/50 hover:border-white/[0.15]"
                    )}>
                    <ReplyAll className="size-3.5" /> All Staff + Patients
                  </button>
                </div>
              </div>

              {/* TO */}
              {recipientType === "individual" && (
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">TO:</label>
                  <RecipientPicker
                    search={recipientSearch}
                    onSearch={setRecipientSearch}
                    selected={selectedRecipients}
                    onToggle={toggleRecipient}
                    staffList={staffList}
                    patientList={patientList}
                    placeholder="Search recipients by name..."
                  />
                  {selectedRecipients.length > 0 && (
                    <p className="text-[10px] text-[#e0a84a] mt-1">{selectedRecipients.length} recipient(s) in TO</p>
                  )}
                </div>
              )}

              {/* CC */}
              {recipientType === "individual" && (
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">CC:</label>
                  <RecipientPicker
                    search={ccSearch}
                    onSearch={setCcSearch}
                    selected={ccRecipients}
                    onToggle={toggleCc}
                    staffList={staffList.filter((s) => !selectedRecipients.includes(s.id))}
                    patientList={patientList.filter((s) => !selectedRecipients.includes(s.id))}
                    placeholder="Search recipients to copy..."
                  />
                  {ccRecipients.length > 0 && (
                    <p className="text-[10px] text-[#e0a84a] mt-1">{ccRecipients.length} recipient(s) in CC</p>
                  )}
                </div>
              )}

              {/* Broadcast scope hint */}
              {recipientType === "staff" && (
                <p className="text-xs text-white/40 italic">
                  This message will be sent to all staff members (admins, doctors, nurses, accountants, and other staff).
                </p>
              )}
              {recipientType === "all" && (
                <p className="text-xs text-white/40 italic">
                  This message will be sent to all staff members AND all registered patients.
                </p>
              )}

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="text-xs text-white/60 mb-1.5 block">Subject</label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Message subject..."
                  className="border-white/[0.08] bg-white/[0.03] text-white/90 placeholder:text-white/30 text-sm" />
              </div>

              {/* Body */}
              <div>
                <label htmlFor="body" className="text-xs text-white/60 mb-1.5 block">Message</label>
                <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message..."
                  rows={8}
                  className="border-white/[0.08] bg-white/[0.03] text-white/90 placeholder:text-white/30 text-sm" />
              </div>

              {sendError && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  <AlertCircle className="size-3.5 mt-0.5 shrink-0" /> {sendError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setActiveTab("inbox"); setSendError(""); }}
                  className="bg-white text-black border-border hover:bg-gray-100">
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}
                  className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20 gap-2">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ──────── Message Detail Dialog ──────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="border-white/[0.08] bg-[#0d1322] text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Mail className="size-4 text-[#e0a84a]" />
              {selectedMsg?.subject}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-white/50 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarImage src={selectedMsg?.sender?.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] bg-white/[0.06] text-white/60">
                    {selectedMsg?.sender?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white/80 font-medium">{selectedMsg?.sender?.full_name || "Unknown"}</p>
                  <p className="text-white/40 capitalize">{selectedMsg?.sender?.role?.replace("_", " ") || ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p>{selectedMsg?.created_at ? `${formatDate(selectedMsg.created_at)} at ${formatTime(selectedMsg.created_at)}` : ""}</p>
                {selectedMsg?.is_broadcast && (
                  <Badge variant="outline" className="mt-1 text-[9px] border-[#e0a84a]/30 text-[#e0a84a] bg-[#e0a84a]/5">
                    Broadcast to {selectedMsg.broadcast_scope === "all" ? "All" : "Staff"}
                  </Badge>
                )}
              </div>
            </div>
            {/* Body */}
            <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed min-h-[100px]">
              {selectedMsg?.body}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {selectedMsg?.sender && (
              <Button onClick={() => startReply(selectedMsg)}
                className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20 gap-2 mr-auto">
                <Reply className="size-4" /> Reply
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailOpen(false)}
              className="bg-white text-black border-border hover:bg-gray-100">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
