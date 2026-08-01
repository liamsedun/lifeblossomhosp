"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, AlertTriangle, Loader2, Download,
  ChevronLeft, ChevronRight, Eye, FileEdit, Trash2, LogIn, LogOut,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface AuditRow {
  id: string;
  user_id: string | null;
  role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: { id: string; first_name: string; last_name: string; email: string } | null;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_id: string | null;
  user?: { id: string; first_name: string; last_name: string; email: string } | null;
}

interface UserOption { id: string; label: string; }

const ACTIONS = ["create", "update", "delete", "view", "login", "logout"];
const ENTITIES = ["patients", "dependants", "medical_records", "appointments", "invoices", "payments", "auth"];
const ROLES = ["super_admin", "admin", "doctor", "nurse", "accountant", "patient"];
const EVENT_TYPES = ["failed_login", "rapid_view", "lockout"];
const SEVERITIES = ["info", "warning", "high", "critical"];

const ACTION_STYLES: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  update: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  delete: "bg-red-500/15 text-red-400 border-red-500/30",
  view: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  login: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  logout: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ActionIcon({ action }: { action: string }) {
  const cls = "size-3.5";
  switch (action) {
    case "create": return <FileEdit className={cls} />;
    case "update": return <FileEdit className={cls} />;
    case "delete": return <Trash2 className={cls} />;
    case "view": return <Eye className={cls} />;
    case "login": return <LogIn className={cls} />;
    case "logout": return <LogOut className={cls} />;
    default: return <Eye className={cls} />;
  }
}

function DiffView({ changes }: { changes: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  const keys = changes ? Object.keys(changes) : [];
  if (!changes || keys.length === 0) {
    return <span className="text-xs text-white/30">—</span>;
  }
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] text-[#e0a84a] hover:text-[#e0a84a]/80"
      >
        {open ? "Hide changes" : `Show ${keys.length} change${keys.length === 1 ? "" : "s"}`}
      </button>
      {open && (
        <div className="mt-2 space-y-1 rounded-lg border border-white/[0.06] bg-black/20 p-2 max-h-56 overflow-y-auto">
          {keys.map((k) => {
            const v = changes[k];
            const display = typeof v === "object" && v !== null
              ? JSON.stringify(v)
              : String(v ?? "null");
            return (
              <div key={k} className="flex gap-2 text-[11px] leading-snug">
                <span className="shrink-0 text-white/50 font-mono">{k}:</span>
                <span className="text-white/80 break-all font-mono">{display.length > 180 ? display.slice(0, 180) + "…" : display}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const { authorized } = useRoleGuard(["super_admin", "admin"]);
  const [tab, setTab] = useState<"logs" | "events">("logs");
  const [loading, setLoading] = useState(true);

  // Filters (logs)
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Filters (events)
  const [eventType, setEventType] = useState("");
  const [severity, setSeverity] = useState("");

  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    if (!authorized) return;
    fetch("/api/admin/users?page_size=100")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const list = (json.data || []).map((u: any) => ({
            id: u.id,
            label: `${u.first_name || ""} ${u.last_name || ""} (${u.email})`.trim(),
          }));
          setUsers(list);
        }
      })
      .catch(() => {});
  }, [authorized]);

  const loadLogs = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (action) params.set("action", action);
      if (entityType) params.set("entity_type", entityType);
      if (role) params.set("role", role);
      if (userId) params.set("user_id", userId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
        setTotal(json.meta?.total || 0);
      }
    } finally { setLoading(false); }
  }, [authorized, page, pageSize, action, entityType, role, userId, from, to]);

  const loadEvents = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (eventType) params.set("event_type", eventType);
      if (severity) params.set("severity", severity);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/security-events?${params}`);
      const json = await res.json();
      if (json.success) {
        setEvents(json.data || []);
        setTotal(json.meta?.total || 0);
      }
    } finally { setLoading(false); }
  }, [authorized, page, pageSize, eventType, severity, from, to]);

  useEffect(() => {
    if (tab === "logs") loadLogs();
    else loadEvents();
  }, [tab, loadLogs, loadEvents]);

  useEffect(() => { setPage(1); }, [action, entityType, role, userId, from, to, eventType, severity, tab]);

  const exportCsv = () => {
    const rows: string[][] = [["Life Blossom Hospital — Audit Trail"]];
    rows.push(["Generated", new Date().toLocaleString()]);
    if (from || to) rows.push(["Period", `${from || "…"} → ${to || "…"}`]);
    rows.push([""]);
    if (tab === "logs") {
      rows.push(["Time", "User", "Role", "Action", "Table", "Record ID", "Description", "IP Address", "User Agent"]);
      logs.forEach((l) => rows.push([
        formatDateTime(l.created_at),
        l.user ? `${l.user.first_name} ${l.user.last_name}` : "System/Service",
        l.role || "",
        l.action,
        l.entity_type,
        l.entity_id || "",
        l.description || "",
        l.ip_address || "",
        l.user_agent || "",
      ]));
    } else {
      rows.push(["Time", "Type", "Severity", "Description", "User", "IP Address"]);
      events.forEach((e) => rows.push([
        formatDateTime(e.created_at),
        e.event_type,
        e.severity,
        e.description,
        e.user ? `${e.user.first_name} ${e.user.last_name}` : "Unknown",
        e.ip_address || "",
      ]));
    }
    downloadCsv(`audit-${tab}-${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!authorized) return null;

  const selectCls = "h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white/80 focus:outline-none focus:border-[#e0a84a]/40";
  const inputCls = "h-9 text-xs bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="size-6 text-[#e0a84a]" /> Security & Audit
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Full traceability: who accessed what, when, and from where
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}
          className="bg-white text-black border-border hover:bg-gray-100 h-9">
          <Download className="size-4 mr-1" />Export CSV
        </Button>
      </div>

      <div className="flex gap-2">
        {(["logs", "events"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-all",
              tab === t
                ? "bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold"
                : "bg-white/[0.04] text-white/50 hover:text-white/80"
            )}
          >
            {t === "logs" ? <Eye className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            {t === "logs" ? "Audit Logs" : "Security Events"}
          </button>
        ))}
      </div>

      <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {tab === "logs" ? (
              <>
                <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={selectCls}>
                  <option value="" className="bg-[#0d1322]">All Tables</option>
                  {ENTITIES.map((t) => <option key={t} value={t} className="bg-[#0d1322]">{t}</option>)}
                </select>
                <select value={action} onChange={(e) => setAction(e.target.value)} className={selectCls}>
                  <option value="" className="bg-[#0d1322]">All Actions</option>
                  {ACTIONS.map((a) => <option key={a} value={a} className="bg-[#0d1322]">{a}</option>)}
                </select>
                <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
                  <option value="" className="bg-[#0d1322]">All Roles</option>
                  {ROLES.map((r) => <option key={r} value={r} className="bg-[#0d1322]">{r}</option>)}
                </select>
                <select value={userId} onChange={(e) => setUserId(e.target.value)} className={cn(selectCls, "max-w-[220px]")}>
                  <option value="" className="bg-[#0d1322]">All Users</option>
                  {users.map((u) => <option key={u.id} value={u.id} className="bg-[#0d1322]">{u.label}</option>)}
                </select>
              </>
            ) : (
              <>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={selectCls}>
                  <option value="" className="bg-[#0d1322]">All Event Types</option>
                  {EVENT_TYPES.map((t) => <option key={t} value={t} className="bg-[#0d1322]">{t}</option>)}
                </select>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectCls}>
                  <option value="" className="bg-[#0d1322]">All Severities</option>
                  {SEVERITIES.map((s) => <option key={s} value={s} className="bg-[#0d1322]">{s}</option>)}
                </select>
              </>
            )}
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className={cn(inputCls, "w-[150px] [color-scheme:dark]")} aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className={cn(inputCls, "w-[150px] [color-scheme:dark]")} aria-label="To date" />
            <span className="text-xs text-white/40">{total} record{total === 1 ? "" : "s"}</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
              </div>
            ) : tab === "logs" ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-wider text-white/40">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Table</th>
                    <th className="px-3 py-2">Record</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">IP</th>
                    <th className="px-3 py-2">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-12 text-center text-xs text-white/40">No audit entries match the filters</td></tr>
                  ) : logs.map((l) => (
                    <tr key={l.id} className="border-b border-white/[0.04] align-top hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 text-xs text-white/50 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs text-white/90 whitespace-nowrap">
                          {l.user ? `${l.user.first_name} ${l.user.last_name}` : "System / Service"}
                        </p>
                        <p className="text-[10px] text-white/40">{l.user?.email || ""}</p>
                        {l.role && (
                          <Badge variant="default" className="mt-1 text-[9px] px-1.5 py-0 capitalize bg-white/[0.06] text-white/50 border-none">
                            {l.role.replace("_", " ")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn("text-[10px] capitalize border", ACTION_STYLES[l.action] || ACTION_STYLES.view)}>
                          <ActionIcon action={l.action} /> {l.action}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/60 font-mono">{l.entity_type}</td>
                      <td className="px-3 py-2.5 text-[10px] text-white/40 font-mono" title={l.entity_id || ""}>
                        {l.entity_id ? l.entity_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/70 max-w-[260px]">{l.description || "—"}</td>
                      <td className="px-3 py-2.5 text-[10px] text-white/40 font-mono">{l.ip_address || "—"}</td>
                      <td className="px-3 py-2.5"><DiffView changes={l.changes} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-wider text-white/40">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-12 text-center text-xs text-white/40">No security events match the filters</td></tr>
                  ) : events.map((e) => (
                    <tr key={e.id} className="border-b border-white/[0.04] align-top hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 text-xs text-white/50 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                      <td className="px-3 py-2.5 text-xs text-white/70 font-mono">{e.event_type}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn("text-[10px] uppercase border", SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.warning)}>
                          {e.severity}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/70 max-w-[300px]">{e.description}</td>
                      <td className="px-3 py-2.5 text-xs text-white/70 whitespace-nowrap">
                        {e.user ? `${e.user.first_name} ${e.user.last_name}` : "Unknown"}
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-white/40 font-mono">{e.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-white/40">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08] h-8">
                <ChevronLeft className="size-3.5 mr-1" />Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08] h-8">
                Next<ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
