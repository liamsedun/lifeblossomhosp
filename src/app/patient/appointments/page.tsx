"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Plus, Video, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppointments } from "@/hooks/use-appointments";
import type { Appointment } from "@/lib/api-types";

const statusColors: Record<string, string> = {
  confirmed: "bg-accent-light text-accent",
  scheduled: "bg-warning-light text-warning",
  in_progress: "bg-primary-lighter text-primary",
  completed: "bg-accent-light text-accent",
  cancelled: "bg-danger-light text-danger",
  no_show: "bg-danger-light text-danger",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  scheduled: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export default function AppointmentsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data: appointments, loading } = useAppointments();

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Appointments</h2>
          <span className="text-xs text-text-secondary bg-muted px-2.5 py-1 rounded-full">...</span>
        </div>
        <div className="flex bg-muted rounded-lg p-1">
          <div className="flex-1 h-9 rounded-md bg-card shadow-sm" />
          <div className="flex-1 h-9" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 card-shadow animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
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
        <h2 className="text-xl font-bold text-foreground">Appointments</h2>
        <span className="text-xs text-text-secondary bg-muted px-2.5 py-1 rounded-full">{appts.length} total</span>
      </div>

      <div className="flex bg-muted rounded-lg p-1">
        <button
          onClick={() => setTab("upcoming")}
          className={cn(
            "flex-1 h-9 text-sm font-medium rounded-md transition-colors",
            tab === "upcoming" ? "bg-card text-foreground shadow-sm" : "text-text-secondary"
          )}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab("past")}
          className={cn(
            "flex-1 h-9 text-sm font-medium rounded-md transition-colors",
            tab === "past" ? "bg-card text-foreground shadow-sm" : "text-text-secondary"
          )}
        >
          Past
        </button>
      </div>

      <div className="space-y-3">
        {appts.length > 0 ? appts.map((appt) => (
          <div
            key={appt.id}
            className="bg-card border border-border rounded-xl p-4 card-shadow hover:card-shadow-hover transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-primary-lighter flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {getInitials(appt)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{getDoctorName(appt)}</h4>
                    <p className="text-xs text-text-secondary">{getSpecialty(appt)}</p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                      statusColors[appt.status] || "bg-muted text-text-secondary"
                    )}
                  >
                    {statusLabels[appt.status] || appt.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-secondary">
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
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button className="flex-1 h-9 text-xs font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                      Reschedule
                    </button>
                    <button className="flex-1 h-9 text-xs font-medium border border-danger/30 text-danger rounded-lg hover:bg-danger-light transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )) : (
          <div className="bg-card border border-border rounded-xl p-6 card-shadow text-center">
            <p className="text-sm text-text-secondary">No {tab} appointments found.</p>
          </div>
        )}
      </div>

      <Link
        href="/patient/book"
        className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-dark transition-all hover:scale-105"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
