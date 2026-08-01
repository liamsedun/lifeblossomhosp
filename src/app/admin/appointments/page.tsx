"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, CheckCircle2, XCircle, Calendar, User, Stethoscope, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate } from "@/lib/utils";
import { useAppointments, useCreateAppointment } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { useStaff } from "@/hooks/use-staff";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type DisplayStatus = "Upcoming" | "Completed" | "Cancelled";

const statusStyles: Record<DisplayStatus, { icon: React.ElementType }> = {
  Upcoming: { icon: Clock },
  Completed: { icon: CheckCircle2 },
  Cancelled: { icon: XCircle },
};

function mapStatus(apiStatus: string): DisplayStatus {
  switch (apiStatus) {
    case "scheduled": case "confirmed": case "in_progress": return "Upcoming";
    case "completed": return "Completed";
    case "cancelled": case "no_show": return "Cancelled";
    default: return "Upcoming";
  }
}

function getDoctorName(apt: any): string {
  const doc = apt.doctor || apt.staff;
  if (doc?.user) return `${doc.user.first_name} ${doc.user.last_name}`;
  return apt.doctor_id || apt.staff_id || "—";
}

function getDepartment(apt: any): string {
  const doc = apt.doctor || apt.staff;
  return doc?.department || "General";
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const { data: appointmentsData, loading, refresh } = useAppointments();
  const { data: patientsData } = usePatients();
  const { data: staffData } = useStaff();
  const { mutate: createAppointment, loading: creating } = useCreateAppointment();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newApt, setNewApt] = useState({ patient_id: "", doctor_id: "", appointment_date: "", start_time: "", reason: "" });
  const [createError, setCreateError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  const appointments = useMemo(() => {
    if (!appointmentsData) return [];
    return appointmentsData.map((apt: any) => ({
      ...apt,
      _displayStatus: mapStatus(apt.status),
      patientName: apt.patient?.user
        ? `${apt.patient.user.first_name} ${apt.patient.user.last_name}`
        : apt.patient_id,
      doctorName: getDoctorName(apt),
      department: getDepartment(apt),
    }));
  }, [appointmentsData]);

  const filtered = appointments.filter((a) => {
    if (tab === "all") return true;
    return a._displayStatus.toLowerCase() === tab;
  });

  async function updateStatus(apt: typeof appointments[number], newStatus: string) {
    setActionLoading(apt.id);
    try {
      const res = await fetch(`/api/appointments/${apt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      refresh();
      const label = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      showToast("success", `Appointment ${label.toLowerCase()} for ${apt.patientName}`);
    } catch (err: any) {
      showToast("error", err.message || "Failed to update appointment");
    }
    finally { setActionLoading(null); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!newApt.patient_id || !newApt.appointment_date || !newApt.start_time) {
      setCreateError("Patient, date, and start time are required");
      return;
    }
    try {
      await createAppointment(newApt as any);
      setShowCreate(false);
      setNewApt({ patient_id: "", doctor_id: "", appointment_date: "", start_time: "", reason: "" });
      refresh();
    } catch (err: any) { setCreateError(err.message); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Appointments</h1>
          <p className="text-sm text-white/50 mt-1">Schedule and manage patient appointments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
          <Plus className="size-4" />New Appointment
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          {["all", "upcoming", "completed", "cancelled"].map((t) => (
            <TabsTrigger key={t} value={t}
              className="capitalize data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-white/40">
              No {tab === "all" ? "" : tab} appointments found.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((apt) => {
                const style = statusStyles[apt._displayStatus as DisplayStatus];
                const Icon = style.icon;
                const loading = actionLoading === apt.id;

                return (
                  <Card key={apt.id} className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl hover:border-white/[0.12] transition-all">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex sm:flex-col items-center gap-2 sm:gap-1 sm:w-20 shrink-0">
                          <div className={cn(
                            "flex items-center justify-center rounded-full size-9",
                            apt._displayStatus === "Upcoming" ? "bg-amber-500/10 text-amber-400"
                              : apt._displayStatus === "Completed" ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          )}>
                            <Icon className="size-5" />
                          </div>
                          <span className="text-sm font-semibold text-white">{apt.start_time?.slice(0, 5) || "—"}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{apt.patientName}</span>
                            <Badge className={cn("text-[10px]",
                              apt._displayStatus === "Upcoming" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : apt._displayStatus === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            )}>{apt._displayStatus}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-white/50 flex-wrap">
                            <span className="flex items-center gap-1"><User className="size-3.5" />{apt.doctorName}</span>
                            <span className="flex items-center gap-1"><Calendar className="size-3.5" />{formatDate(apt.appointment_date)}</span>
                            <span className="flex items-center gap-1"><Stethoscope className="size-3.5" />{apt.department}</span>
                          </div>
                        </div>

                        {apt._displayStatus === "Upcoming" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" disabled={loading} onClick={() => updateStatus(apt, "confirmed")}
                              className="h-8 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">Confirm</Button>
                            <Button size="sm" disabled={loading} onClick={() => updateStatus(apt, "completed")}
                              className="h-8 text-xs bg-[#e0a84a]/10 text-[#e0a84a] border border-[#e0a84a]/20 hover:bg-[#e0a84a]/20">Complete</Button>
                            <Button size="sm" variant="ghost" disabled={loading} onClick={() => updateStatus(apt, "cancelled")}
                              className="h-8 text-xs text-rose-400 hover:bg-white/[0.06]">Cancel</Button>
                          </div>
                        )}
                        {apt._displayStatus === "Completed" && (
                          <Badge variant="outline" className="shrink-0 text-[11px] border-emerald-500/20 text-emerald-400 bg-emerald-500/5">Done</Badge>
                        )}
                        {apt._displayStatus === "Cancelled" && (
                          <Badge variant="outline" className="shrink-0 text-[11px] border-rose-500/20 text-rose-400 bg-rose-500/5">Cancelled</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Appointment Modal */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!creating) { setShowCreate(o); setCreateError(""); } }}>
        <DialogContent className="sm:max-w-md border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">New Appointment</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Patient *</label>
              <select value={newApt.patient_id} onChange={(e) => setNewApt({ ...newApt, patient_id: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white" required>
                <option value="" className="bg-[#0d1322]">Select patient…</option>
                {(patientsData || []).map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0d1322]">
                    {p.user?.first_name} {p.user?.last_name} ({p.patient_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Doctor</label>
              <select value={newApt.doctor_id} onChange={(e) => setNewApt({ ...newApt, doctor_id: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                <option value="" className="bg-[#0d1322]">Select doctor…</option>
                {(staffData || []).filter((s) => s.user?.role === "doctor").map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0d1322]">
                    Dr. {s.user?.first_name} {s.user?.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Date *</label>
                <Input type="date" value={newApt.appointment_date}
                  onChange={(e) => setNewApt({ ...newApt, appointment_date: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Time *</label>
                <Input type="time" value={newApt.start_time}
                  onChange={(e) => setNewApt({ ...newApt, start_time: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white [color-scheme:dark]" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Reason</label>
              <Input value={newApt.reason} onChange={(e) => setNewApt({ ...newApt, reason: e.target.value })}
                placeholder="e.g. Annual checkup" className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            {createError && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{createError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={creating}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                {creating ? "Creating..." : "Create Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all animate-in slide-in-from-right",
          toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        )}>
          <span className="flex items-center gap-2">
            {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {toast.message}
          </span>
        </div>
      )}
    </div>
  );
}
