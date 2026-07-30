"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Plus, Video, ChevronRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppointmentStore } from "@/stores/appointment-store";
import type { Appointment } from "@/lib/api-types";

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  scheduled: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  no_show: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  scheduled: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 overflow-hidden transition-all duration-300 hover:border-white/[0.12]",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.04] to-transparent" />
      {children}
    </div>
  );
}

export default function AppointmentsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const store = useAppointmentStore();
  const appointments = store.appointments;
  const loading = store.loading;

  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const upcomingAppts = (appointments ?? []).filter(
    (a) => a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress"
  );
  const pastAppts = (appointments ?? []).filter(
    (a) => a.status === "completed" || a.status === "cancelled" || a.status === "no_show"
  );
  const appts = tab === "upcoming" ? upcomingAppts : pastAppts;

  const getInitials = (appt: Appointment) => {
    if (appt.staff?.user) {
      return `${appt.staff.user.first_name.charAt(0)}${appt.staff.user.last_name.charAt(0)}`.toUpperCase();
    }
    return "DR";
  };

  const getDoctorName = (appt: Appointment) => {
    if (appt.staff?.user) {
      return `Dr. ${appt.staff.user.first_name} ${appt.staff.user.last_name.charAt(0)}.`;
    }
    return "Doctor";
  };

  const getSpecialty = (appt: Appointment) => {
    return appt.staff?.specialization || "General";
  };

  const getTypeLabel = (type: string) => {
    return type === "video_call" ? "Video Call" : "In-person";
  };

  const openReschedule = (appt: Appointment) => {
    setRescheduleAppt(appt);
    setRescheduleDate(appt.appointment_date);
    setRescheduleTime(appt.start_time?.slice(0, 5) || "");
    setRescheduleReason("");
    setActionError("");
    setActionSuccess("");
  };

  const handleReschedule = async () => {
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    setActionError("");
    try {
      await store.updateAppointment(rescheduleAppt.id, {
        appointment_date: rescheduleDate,
        start_time: rescheduleTime,
        end_time: `${rescheduleTime.slice(0, 2)}:${String(parseInt(rescheduleTime.slice(3, 5)) + 30).padStart(2, "0")}`,
        notes: rescheduleReason ? `Rescheduled: ${rescheduleReason}` : undefined,
      });
      setActionSuccess("Appointment rescheduled successfully!");
      setTimeout(() => { setRescheduleAppt(null); setActionSuccess(""); }, 1500);
    } catch (err: any) {
      setActionError(err.message || "Failed to reschedule");
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelAppt) return;
    setCancelling(true);
    setActionError("");
    try {
      await store.cancelAppointment(cancelAppt.id, "Cancelled by patient");
      setCancelAppt(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Appointments</h2>
          <span className="text-xs text-white/40 bg-white/[0.04] px-2.5 py-1 rounded-full">...</span>
        </div>
        <div className="flex bg-white/[0.04] rounded-xl p-1">
          <div className="flex-1 h-9 rounded-lg bg-white/[0.06]" />
          <div className="flex-1 h-9" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-white/[0.06] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/[0.06] rounded w-1/2" />
                  <div className="h-3 bg-white/[0.06] rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Appointments</h2>
        <span className="text-xs text-white/40 bg-white/[0.04] px-2.5 py-1 rounded-full">{appts.length} total</span>
      </div>

      <div className="flex bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
        <button
          onClick={() => setTab("upcoming")}
          className={cn(
            "flex-1 h-9 text-sm font-medium rounded-lg transition-all duration-200",
            tab === "upcoming" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/70"
          )}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab("past")}
          className={cn(
            "flex-1 h-9 text-sm font-medium rounded-lg transition-all duration-200",
            tab === "past" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/70"
          )}
        >
          Past
        </button>
      </div>

      <div className="space-y-3">
        {appts.length > 0 ? appts.map((appt) => (
          <GlassCard key={appt.id}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#e0a84a]/20 to-[#e0a84a]/5 flex items-center justify-center text-[#e0a84a] font-bold text-sm shrink-0">
                {getInitials(appt)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{getDoctorName(appt)}</h4>
                    <p className="text-xs text-white/50">{getSpecialty(appt)}</p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                      statusColors[appt.status] || "bg-white/[0.04] text-white/40 border-white/[0.06]"
                    )}
                  >
                    {statusLabels[appt.status] || appt.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(appt.appointment_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {appt.start_time?.slice(0, 5)}
                  </span>
                  <span className="flex items-center gap-1">
                    {appt.type === "video_call" ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                    {getTypeLabel(appt.type)}
                  </span>
                </div>
                {tab === "upcoming" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                    <button
                      onClick={() => openReschedule(appt)}
                      className="flex-1 h-9 text-xs font-medium rounded-xl border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => { setCancelAppt(appt); setActionError(""); }}
                      className="flex-1 h-9 text-xs font-medium rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        )) : (
          <GlassCard>
            <div className="text-center py-6">
              <p className="text-sm text-white/40">No {tab} appointments found.</p>
            </div>
          </GlassCard>
        )}
      </div>

      <Link
        href="/patient/book"
        className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-gradient-to-br from-[#e0a84a] to-amber-500 text-[#0a0f1a] rounded-full flex items-center justify-center shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30 transition-all hover:scale-110 active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </Link>

      {/* Reschedule Modal */}
      {rescheduleAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0d1322]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-base font-semibold text-white">Reschedule Appointment</h3>
              <button onClick={() => setRescheduleAppt(null)} className="p-1 text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-white/60">
                {getDoctorName(rescheduleAppt)} &middot; {getSpecialty(rescheduleAppt)}
              </p>
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/30 focus:border-[#e0a84a]/40"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">New Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/30 focus:border-[#e0a84a]/40"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">Reason (optional)</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Why are you rescheduling?"
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/30 focus:border-[#e0a84a]/40"
                />
              </div>
              {actionError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{actionError}</div>
              )}
              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-400">
                  <Check className="w-4 h-4" />
                  {actionSuccess}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setRescheduleAppt(null)}
                  className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm font-medium text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold hover:shadow-lg hover:shadow-[#e0a84a]/20 transition-all disabled:opacity-50"
                >
                  {rescheduling ? "Rescheduling..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {cancelAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0d1322]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-rose-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Cancel Appointment</h3>
            <p className="text-sm text-white/50 mb-6">
              Cancel your appointment with {getDoctorName(cancelAppt)} on{" "}
              {new Date(cancelAppt.appointment_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              ?
            </p>
            {actionError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400 mb-4">{actionError}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setCancelAppt(null)}
                className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm font-medium text-white/70 hover:bg-white/[0.06] transition-colors"
              >
                Keep
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-rose-500/20 transition-all disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
