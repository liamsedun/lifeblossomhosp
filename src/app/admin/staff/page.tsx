"use client";

import { useState, useMemo } from "react";
import {
  Stethoscope, Clock, CalendarDays, Phone, Mail,
  MoreHorizontal, Plus, Trash2, PenLine, Search, Loader2, Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

const emptyForm: StaffForm = {
  email: "", password: "", first_name: "", last_name: "", phone: "",
  role: "doctor", specialization: "", department: "", license_number: "",
};

function getStatus(staff: Staff): "On Duty" | "Off Duty" | "On Leave" {
  if (!staff.is_available) return "Off Duty";
  return "On Duty";
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
  const [scheduleStaff, setScheduleStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({ is_available: true, available_from: "09:00", available_until: "17:00" });
  const [formError, setFormError] = useState("");

  const departments = useMemo(() => {
    if (!staffData) return ["All"];
    const depts = new Set(staffData.map((s) => s.department || "General"));
    return ["All", ...Array.from(depts).sort()];
  }, [staffData]);

  const filtered = useMemo(() => {
    if (!staffData) return [];
    return staffData.filter((s) => {
      if (deptFilter !== "All" && s.department !== deptFilter) return false;
      const status = getStatus(s).toLowerCase().replace(/ /g, "_");
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
  }, [staffData, deptFilter, statusFilter, search]);

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

  async function handleSchedule() {
    if (!scheduleStaff) return;
    setScheduling(true);
    try {
      const res = await fetch(`/api/staff/${scheduleStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update schedule");
      setScheduleStaff(null); refresh();
    } catch (err: any) { alert(err.message); }
    finally { setScheduling(false); }
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

  function openSchedule(s: Staff) {
    setScheduleStaff(s);
    setScheduleForm({
      is_available: s.is_available,
      available_from: s.available_from?.slice(0, 5) || "09:00",
      available_until: s.available_until?.slice(0, 5) || "17:00",
    });
  }

  if (!authorized) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff</h1>
          <p className="text-sm text-white/50 mt-1">Manage hospital staff and schedules</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAdd(true); }}
          className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
          <Plus className="size-4" />Add Staff Member
        </Button>
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
          const status = getStatus(staff);
          const name = staff.user ? `${staff.user.first_name} ${staff.user.last_name}` : staff.staff_number;
          const initials = staff.user ? getInitials(`${staff.user.first_name} ${staff.user.last_name}`) : "ST";
          const statusColor = status === "On Duty" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : status === "On Leave" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-white/[0.04] text-white/40 border-white/[0.06]";

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
                    <DropdownMenuContent align="end" className="w-36 border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white/80">
                      <DropdownMenuItem onClick={() => openEdit(staff)}
                        className="hover:bg-white/[0.06] hover:text-white">
                        <PenLine className="size-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        openSchedule(staff);
                      }}
                        className="hover:bg-white/[0.06] hover:text-white">
                        <Calendar className="size-3.5 mr-2" />Schedule
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
                    <span>{staff.is_available
                      ? `${staff.available_from?.slice(0, 5) || "09:00"} – ${staff.available_until?.slice(0, 5) || "17:00"}`
                      : "Not available"}</span>
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
                    onClick={() => openSchedule(staff)}>
                    <CalendarDays className="size-3.5 mr-1" />Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Cancel</Button>
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
                <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={!!scheduleStaff} onOpenChange={(o) => { if (!o && !scheduling) setScheduleStaff(null); }}>
        <DialogContent className="sm:max-w-sm border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">Schedule Duty</DialogTitle></DialogHeader>
          {scheduleStaff && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl">
                <Avatar className="size-10 ring-1 ring-[#e0a84a]/20">
                  <AvatarFallback className="text-xs bg-[#1a2540] text-[#e0a84a] font-semibold">
                    {getInitials(`${scheduleStaff.user?.first_name || ""} ${scheduleStaff.user?.last_name || ""}`)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {scheduleStaff.user?.first_name} {scheduleStaff.user?.last_name}
                  </p>
                  <p className="text-xs text-white/50">{scheduleStaff.department || "—"}</p>
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
                  <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSchedule} disabled={scheduling}
                  className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                  {scheduling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {scheduling ? "Saving..." : "Save Schedule"}
                </Button>
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
              <Button type="button" variant="outline" className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">Cancel</Button>
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
