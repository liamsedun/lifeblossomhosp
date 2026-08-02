"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Stethoscope, Clock, CalendarDays, Phone, Mail,
  MoreHorizontal, Plus, Trash2, PenLine, Search, Loader2, Calendar, CalendarClock, UserRoundCheck, UserRoundX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useStaff, useCreateStaff } from "@/hooks/use-staff";
import { useRoleGuard } from "@/hooks/use-role-guard";
import type { Staff } from "@/lib/api-types";

type StatusFilter = "all" | "on_duty" | "off_duty" | "on_leave";

interface DutyShift {
  id: string;
  staff_id: string;
  shift_date: string;
  from_time: string;
  until_time: string;
  note: string | null;
  staff?: { id: string; staff_number: string; user?: { id: string; first_name: string; last_name: string } | null };
}

interface StaffForm {
  email: string; password: string; first_name: string; last_name: string;
  phone: string; role: string; specialization: string; department: string;
  license_number: string;
}

interface ScheduleForm {
  is_available: boolean;
  available_from: string;
  available_until: string;
}

interface RosterForm {
  staff_ids: string[];
  from_date: string;
  to_date: string;
  from_time: string;
  until_time: string;
  note: string;
  notify: boolean;
}

const emptyForm: StaffForm = {
  email: "", password: "", first_name: "", last_name: "", phone: "",
  role: "doctor", specialization: "", department: "", license_number: "",
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

function getStatus(staff: Staff, shift?: DutyShift): "On Duty" | "Off Duty" | "On Leave" {
  if (staff.on_leave_until && todayStr() <= staff.on_leave_until) return "On Leave";
  if (shift) return "On Duty";
  return "Off Duty";
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const roles = ["doctor", "nurse", "admin", "accountant", "super_admin"];

export default function StaffPage() {
  const { authorized } = useRoleGuard(["super_admin", "admin", "accountant"]);
  const { data: staffData, loading, refresh } = useStaff();
  const { mutate: createStaff, loading: creating } = useCreateStaff();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deptFilter, setDeptFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [availStaff, setAvailStaff] = useState<Staff | null>(null);
  const [showRoster, setShowRoster] = useState(false);
  const [leaveStaff, setLeaveStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [rosterSaving, setRosterSaving] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({ is_available: true, available_from: "09:00", available_until: "17:00" });
  const [rosterForm, setRosterForm] = useState<RosterForm>({
    staff_ids: [], from_date: todayStr(), to_date: todayStr(),
    from_time: "08:00", until_time: "16:00", note: "", notify: true,
  });
  const [leaveForm, setLeaveForm] = useState({ on_leave_until: "" });
  const [formError, setFormError] = useState("");

  // Today's duty shifts + upcoming roster (next 14 days)
  const [todayShifts, setTodayShifts] = useState<DutyShift[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<DutyShift[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    const today = todayStr();
    const week = addDays(today, 13);
    try {
      const [todayRes, upRes] = await Promise.all([
        fetch(`/api/staff/roster?from=${today}&to=${today}`),
        fetch(`/api/staff/roster?from=${today}&to=${week}`),
      ]);
      const [todayJson, upJson] = await Promise.all([todayRes.json(), upRes.json()]);
      if (todayJson.success) setTodayShifts(todayJson.data || []);
      if (upJson.success) setUpcomingShifts(upJson.data || []);
    } catch { /* ignore */ }
    finally { setRosterLoading(false); }
  }, []);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  const todayShiftByStaff = useMemo(() => {
    const map = new Map<string, DutyShift>();
    todayShifts.forEach((s) => map.set(s.staff_id, s));
    return map;
  }, [todayShifts]);

  const departments = useMemo(() => {
    if (!staffData) return ["All"];
    const depts = new Set(staffData.map((s) => s.department || "General"));
    return ["All", ...Array.from(depts).sort()];
  }, [staffData]);

  const filtered = useMemo(() => {
    if (!staffData) return [];
    return staffData.filter((s) => {
      if (deptFilter !== "All" && s.department !== deptFilter) return false;
      const status = getStatus(s, todayShiftByStaff.get(s.id)).toLowerCase().replace(/ /g, "_");
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (search) {
        const name = s.user ? `${s.user.first_name} ${s.user.last_name}` : "";
        const dept = s.department || "";
        const spec = s.specialization || "";
        const q = search.toLowerCase();
        if (!name.toLowerCase().includes(q) && !dept.toLowerCase().includes(q) && !spec.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [staffData, deptFilter, statusFilter, search, todayShiftByStaff]);

  function resetForm() { setForm(emptyForm); setFormError(""); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      setFormError("Email, password, first name, and last name are required");
      return;
    }
    try {
      await createStaff(form as any);
      setShowAdd(false); resetForm(); refresh();
    } catch (err: any) { setFormError(err.message); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaff) return;
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${editStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      setEditStaff(null); refresh();
    } catch (err: any) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  async function handleAvailability() {
    if (!availStaff) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${availStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update availability");
      setAvailStaff(null); refresh();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleRosterSave() {
    if (rosterForm.staff_ids.length === 0) {
      alert("Select at least one staff member to schedule.");
      return;
    }
    if (!rosterForm.from_date || !rosterForm.to_date) {
      alert("Pick a from date and a to date for the duty period.");
      return;
    }
    if (rosterForm.to_date < rosterForm.from_date) {
      alert("The 'To' date cannot be before the 'From' date.");
      return;
    }
    setRosterSaving(true);
    try {
      const staffById = new Map((staffData || []).map((s) => [s.id, s]));
      const entries: any[] = [];
      for (const sid of rosterForm.staff_ids) {
        const s = staffById.get(sid);
        for (let d = new Date(`${rosterForm.from_date}T00:00:00`), i = 0; d <= new Date(`${rosterForm.to_date}T00:00:00`); d.setDate(d.getDate() + 1), i++) {
          const ds = addDays(rosterForm.from_date, i);
          entries.push({
            staff_id: sid,
            user_id: s?.user_id || null,
            shift_date: ds,
            from_time: rosterForm.from_time,
            until_time: rosterForm.until_time,
            note: rosterForm.note || null,
          });
        }
      }
      const res = await fetch("/api/staff/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, notify: rosterForm.notify }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save duty schedule");
      const { notified } = json.data || {};
      setShowRoster(false);
      refresh(); loadRoster();
      alert(notified && notified > 0
        ? `Duty schedule saved — ${entries.length} shift(s) assigned, ${notified} notification(s) sent.`
        : `Duty schedule saved — ${entries.length} shift(s) assigned.`);
    } catch (err: any) { alert(err.message); }
    finally { setRosterSaving(false); }
  }

  async function handleMarkLeave() {
    if (!leaveStaff) return;
    if (!leaveForm.on_leave_until) {
      alert("Pick the date the staff member returns from leave.");
      return;
    }
    setLeaveSaving(true);
    try {
      const res = await fetch("/api/staff/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: leaveStaff.id, on_leave_until: leaveForm.on_leave_until }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to mark leave");
      setLeaveStaff(null); refresh();
    } catch (err: any) { alert(err.message); }
    finally { setLeaveSaving(false); }
  }

  async function handleReturnToDuty() {
    if (!leaveStaff) return;
    setLeaveSaving(true);
    try {
      const res = await fetch(`/api/staff/leave?staff_id=${leaveStaff.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to clear leave");
      setLeaveStaff(null); refresh();
    } catch (err: any) { alert(err.message); }
    finally { setLeaveSaving(false); }
  }

  async function handleDelete() {
    if (!deleteStaff) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${deleteStaff.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      setDeleteStaff(null); refresh();
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }

  function openEdit(s: Staff) {
    setEditStaff(s);
    setForm({
      email: s.user?.email || "", password: "",
      first_name: s.user?.first_name || "", last_name: s.user?.last_name || "",
      phone: s.user?.phone || "", role: s.user?.role || "",
      specialization: s.specialization || "", department: s.department || "",
      license_number: s.license_number || "",
    });
    setFormError("");
  }

  function openAvailability(s: Staff) {
    setAvailStaff(s);
    setScheduleForm({
      is_available: s.is_available,
      available_from: s.available_from?.slice(0, 5) || "09:00",
      available_until: s.available_until?.slice(0, 5) || "17:00",
    });
  }

  function openRoster(preSelected?: Staff) {
    setRosterForm((prev) => ({
      ...prev,
      staff_ids: preSelected ? [preSelected.id] : (staffData || []).map((s) => s.id),
    }));
    setShowRoster(true);
  }

  function openLeave(s: Staff) {
    setLeaveStaff(s);
    setLeaveForm({ on_leave_until: s.on_leave_until || addDays(todayStr(), 14) });
  }

  const toggleStaff = (id: string) => {
    setRosterForm((prev) => ({
      ...prev,
      staff_ids: prev.staff_ids.includes(id)
        ? prev.staff_ids.filter((x) => x !== id)
        : [...prev.staff_ids, id],
    }));
  };

  const rosterDays = useMemo(() => {
    if (!rosterForm.from_date || !rosterForm.to_date) return 0;
    const a = new Date(`${rosterForm.from_date}T00:00:00`);
    const b = new Date(`${rosterForm.to_date}T00:00:00`);
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
  }, [rosterForm.from_date, rosterForm.to_date]);

  const rosterTotalShifts = rosterDays * rosterForm.staff_ids.length;

  if (!authorized) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff</h1>
          <p className="text-sm text-white/50 mt-1">Manage hospital staff, duty roaster and schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openRoster()}
            className="bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1]">
            <CalendarClock className="size-4" />Schedule Duty
          </Button>
          <Button onClick={() => { resetForm(); setShowAdd(true); }}
            className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
            <Plus className="size-4" />Add Staff Member
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <Input placeholder="Search by name, department, or specialty..."
            className="h-9 pl-9 text-sm bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white/80">
          {departments.map((d) => (
            <option key={d} value={d} className="bg-[#0d1322]">{d}</option>
          ))}
        </select>
        <div className="flex bg-white/[0.04] rounded-xl p-0.5 border border-white/[0.06]">
          {(["all", "on_duty", "off_duty", "on_leave"] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize",
                statusFilter === f ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70"
              )}>
              {f === "all" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
              <CardContent className="p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/[0.06] rounded w-2/3" />
                    <div className="h-3 bg-white/[0.06] rounded w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-sm text-white/40">
            {staffData?.length === 0 ? "No staff members yet." : "No staff match the current filters."}
          </div>
        ) : filtered.map((staff) => {
          const shift = todayShiftByStaff.get(staff.id);
          const status = getStatus(staff, shift);
          const name = staff.user ? `${staff.user.first_name} ${staff.user.last_name}` : staff.staff_number;
          const initials = staff.user ? getInitials(`${staff.user.first_name} ${staff.user.last_name}`) : "ST";
          const statusColor = status === "On Duty" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : status === "On Leave" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-white/[0.04] text-white/40 border-white/[0.06]";
          const onLeave = status === "On Leave";

          return (
            <Card key={staff.id} className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl hover:border-white/[0.12] transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 ring-1 ring-[#e0a84a]/20">
                      <AvatarImage src="" alt={name} />
                      <AvatarFallback className="text-sm bg-[#1a2540] text-[#e0a84a] font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-white">{name}</p>
                      <p className="text-xs text-white/50 capitalize">{staff.user?.role?.replace("_", " ") || "Staff"}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white/80">
                      <DropdownMenuItem onClick={() => openRoster(staff)}
                        className="hover:bg-white/[0.06] hover:text-white">
                        <CalendarClock className="size-3.5 mr-2" />Schedule Duty
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAvailability(staff)}
                        className="hover:bg-white/[0.06] hover:text-white">
                        <Clock className="size-3.5 mr-2" />Availability
                      </DropdownMenuItem>
                      {onLeave ? (
                        <DropdownMenuItem onClick={() => openLeave(staff)}
                          className="hover:bg-white/[0.06] hover:text-white">
                          <UserRoundCheck className="size-3.5 mr-2" />Return to Duty
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => openLeave(staff)}
                          className="hover:bg-white/[0.06] hover:text-white">
                          <UserRoundX className="size-3.5 mr-2" />Mark On Leave
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEdit(staff)}
                        className="hover:bg-white/[0.06] hover:text-white">
                        <PenLine className="size-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteStaff(staff)}
                        className="text-red-400 hover:bg-white/[0.06] hover:text-red-300">
                        <Trash2 className="size-3.5 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2 text-xs text-white/50">
                  {staff.department && (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="size-3.5 shrink-0" />
                      <span>{staff.department}{staff.specialization ? ` — ${staff.specialization}` : ""}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 shrink-0" />
                    {onLeave ? (
                      <span className="text-amber-400/80">On leave until {fmtDate(staff.on_leave_until || "")}</span>
                    ) : shift ? (
                      <span className="text-emerald-400/90">Duty: FROM {fmtTime(shift.from_time)} UNTIL {fmtTime(shift.until_time)}</span>
                    ) : (
                      <span>{staff.is_available
                        ? `Available: ${fmtTime(staff.available_from || "")} – ${fmtTime(staff.available_until || "")}`
                        : "Not available today"}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0" />
                    <span>{staff.user?.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{staff.user?.email || "—"}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Badge variant="outline" className={cn("text-[10px] border", statusColor)}>{status}</Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#e0a84a]/70 hover:text-[#e0a84a]"
                    onClick={() => openRoster(staff)}>
                    <CalendarDays className="size-3.5 mr-1" />Schedule Duty
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upcoming duty roaster (next 14 days) */}
      <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base text-white">Duty Roaster — Next 14 Days</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-[#e0a84a]/70 hover:text-[#e0a84a]"
            onClick={() => openRoster()}>
            <CalendarClock className="size-3.5 mr-1" />Schedule Duty
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {rosterLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-[#e0a84a]" /></div>
          ) : upcomingShifts.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/40">
              No duty scheduled yet. Use "Schedule Duty" to assign shifts (up to a month at a time) — scheduled staff get an in-app + push notification with the date and time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-white/40 border-b border-white/[0.06]">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Staff</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {upcomingShifts.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-2.5 text-white/80 whitespace-nowrap">{fmtDate(s.shift_date)}</td>
                      <td className="px-5 py-2.5 text-white">
                        {s.staff?.user
                          ? `${s.staff.user.first_name} ${s.staff.user.last_name}`
                          : (s.staff?.staff_number || "—")}
                      </td>
                      <td className="px-5 py-2.5 text-[#e0a84a] whitespace-nowrap">
                        FROM {fmtTime(s.from_time)} UNTIL {fmtTime(s.until_time)}
                      </td>
                      <td className="px-5 py-2.5 text-white/40">{s.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!creating) { setShowAdd(o); if (!o) resetForm(); } }}>
        <DialogContent className="sm:max-w-md border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">Add Staff Member</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">First Name *</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Last Name *</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] text-white" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Password *</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters" className="bg-white/[0.04] border-white/[0.08] text-white" required minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  {roles.map((r) => (
                    <option key={r} value={r} className="bg-[#0d1322]">{r.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Department</label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. Cardiology" className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Specialization</label>
              <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                placeholder="e.g. Cardiologist" className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+234 XXX XXX XXXX" className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            {formError && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{formError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={creating}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                {creating ? "Creating..." : "Create Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={!!editStaff} onOpenChange={(o) => { if (!o && !saving) { setEditStaff(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">Edit Staff Member</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">First Name</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Last Name</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  {roles.map((r) => (
                    <option key={r} value={r} className="bg-[#0d1322]">{r.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Department</label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Specialization</label>
              <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            {formError && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{formError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Availability Modal */}
      <Dialog open={!!availStaff} onOpenChange={(o) => { if (!o && !saving) setAvailStaff(null); }}>
        <DialogContent className="sm:max-w-sm border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">Availability</DialogTitle></DialogHeader>
          {availStaff && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl">
                <Avatar className="size-10 ring-1 ring-[#e0a84a]/20">
                  <AvatarFallback className="text-xs bg-[#1a2540] text-[#e0a84a] font-semibold">
                    {getInitials(`${availStaff.user?.first_name || ""} ${availStaff.user?.last_name || ""}`)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {availStaff.user?.first_name} {availStaff.user?.last_name}
                  </p>
                  <p className="text-xs text-white/50">{availStaff.department || "—"}</p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer"
                    checked={scheduleForm.is_available}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, is_available: e.target.checked })} />
                  <div className="w-9 h-5 rounded-full bg-white/[0.08] peer-checked:bg-emerald-500/50 transition-colors" />
                  <div className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                    scheduleForm.is_available && "translate-x-4 bg-emerald-400"
                  )} />
                </div>
                <span className="text-sm text-white/80">{scheduleForm.is_available ? "Available for duty" : "Not available"}</span>
              </label>

              {scheduleForm.is_available && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">From</label>
                    <Input type="time" value={scheduleForm.available_from}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, available_from: e.target.value })}
                      className="bg-white/[0.04] border-white/[0.08] text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Until</label>
                    <Input type="time" value={scheduleForm.available_until}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, available_until: e.target.value })}
                      className="bg-white/[0.04] border-white/[0.08] text-white" />
                  </div>
                </div>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAvailability} disabled={saving}
                  className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {saving ? "Saving..." : "Save Availability"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Duty (Roaster) Modal */}
      <Dialog open={showRoster} onOpenChange={(o) => { if (!o && !rosterSaving) setShowRoster(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">Schedule Duty (Roaster)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Staff selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-white/50">Staff ({rosterForm.staff_ids.length} selected)</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRosterForm((p) => ({ ...p, staff_ids: (staffData || []).map((s) => s.id) }))}
                    className="text-[10px] font-medium text-[#e0a84a] hover:text-[#e0a84a]/70">Select All</button>
                  <button type="button" onClick={() => setRosterForm((p) => ({ ...p, staff_ids: [] }))}
                    className="text-[10px] font-medium text-white/40 hover:text-white/70">Clear</button>
                </div>
              </div>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.05]">
                {(staffData || []).map((s) => {
                  const checked = rosterForm.staff_ids.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleStaff(s.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors">
                      <div className={cn("size-4 rounded border flex items-center justify-center shrink-0",
                        checked ? "bg-[#e0a84a] border-[#e0a84a]" : "border-white/25")}>
                        {checked && <span className="text-[#0a0f1a] text-[10px] font-bold">✓</span>}
                      </div>
                      <Avatar className="size-7 ring-1 ring-[#e0a84a]/20">
                        <AvatarFallback className="text-[9px] bg-[#1a2540] text-[#e0a84a] font-semibold">
                          {getInitials(`${s.user?.first_name || ""} ${s.user?.last_name || ""}`)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-white/85">{s.user?.first_name} {s.user?.last_name}</span>
                      <span className="ml-auto text-[10px] text-white/35 capitalize">{s.department || "—"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">From Date</label>
                <Input type="date" value={rosterForm.from_date}
                  onChange={(e) => setRosterForm({ ...rosterForm, from_date: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">To Date</label>
                <Input type="date" value={rosterForm.to_date}
                  onChange={(e) => setRosterForm({ ...rosterForm, to_date: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" />
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">FROM (time)</label>
                <Input type="time" value={rosterForm.from_time}
                  onChange={(e) => setRosterForm({ ...rosterForm, from_time: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">UNTIL (time)</label>
                <Input type="time" value={rosterForm.until_time}
                  onChange={(e) => setRosterForm({ ...rosterForm, until_time: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Note (optional)</label>
              <Input value={rosterForm.note}
                onChange={(e) => setRosterForm({ ...rosterForm, note: e.target.value })}
                placeholder="e.g. Ward A shift" className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only peer"
                  checked={rosterForm.notify}
                  onChange={(e) => setRosterForm({ ...rosterForm, notify: e.target.checked })} />
                <div className="w-9 h-5 rounded-full bg-white/[0.08] peer-checked:bg-emerald-500/50 transition-colors" />
                <div className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                  rosterForm.notify && "translate-x-4 bg-emerald-400"
                )} />
              </div>
              <span className="text-sm text-white/80">Notify staff (in-app + push): "DATE: … TIME: FROM: … UNTIL: …"</span>
            </label>

            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-xs text-white/60">
              {rosterTotalShifts > 0
                ? <><span className="text-white font-medium">{rosterTotalShifts} shift(s)</span> across {rosterDays} day(s) for {rosterForm.staff_ids.length} staff member(s)</>
                : "Select staff and a date range to schedule shifts."}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button onClick={handleRosterSave} disabled={rosterSaving || rosterTotalShifts === 0}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                {rosterSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {rosterSaving ? "Saving..." : "Save Duty Schedule"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark On Leave Modal */}
      <Dialog open={!!leaveStaff} onOpenChange={(o) => { if (!o && !leaveSaving) setLeaveStaff(null); }}>
        <DialogContent className="sm:max-w-sm border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">Mark On Leave</DialogTitle></DialogHeader>
          {leaveStaff && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl">
                <Avatar className="size-10 ring-1 ring-[#e0a84a]/20">
                  <AvatarFallback className="text-xs bg-[#1a2540] text-[#e0a84a] font-semibold">
                    {getInitials(`${leaveStaff.user?.first_name || ""} ${leaveStaff.user?.last_name || ""}`)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {leaveStaff.user?.first_name} {leaveStaff.user?.last_name}
                  </p>
                  <p className="text-xs text-white/50">
                    {leaveStaff.on_leave_until ? `Currently on leave until ${fmtDate(leaveStaff.on_leave_until)}` : (leaveStaff.department || "—")}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Returns to Duty On</label>
                <Input type="date" value={leaveForm.on_leave_until}
                  onChange={(e) => setLeaveForm({ on_leave_until: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" />
              </div>

              <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
                {leaveStaff.on_leave_until ? (
                  <Button type="button" variant="outline" onClick={handleReturnToDuty} disabled={leaveSaving}
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
                    {leaveSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Return to Duty
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleMarkLeave} disabled={leaveSaving}
                    className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                    {leaveSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {leaveSaving ? "Saving..." : "Save Leave"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteStaff} onOpenChange={(o) => { if (!o) setDeleteStaff(null); }}>
        <DialogContent className="sm:max-w-sm border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">Deactivate Staff</DialogTitle></DialogHeader>
          <p className="text-sm text-white/60">
            Are you sure you want to deactivate <strong className="text-white">
              {deleteStaff?.user ? `${deleteStaff.user.first_name} ${deleteStaff.user.last_name}` : "this staff member"}
            </strong>? They will be unable to log in.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleDelete} disabled={deleting}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 shadow-lg shadow-rose-500/20">
              {deleting ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
