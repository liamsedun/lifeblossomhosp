"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Stethoscope,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { useAppointments } from "@/hooks/use-appointments";
import type { AppointmentStatus } from "@/lib/api-types";

type DisplayStatus = "Upcoming" | "Completed" | "Cancelled";

interface AppointmentDisplay {
  id: string;
  patient: string;
  doctor: string;
  date: string;
  time: string;
  department: string;
  status: DisplayStatus;
}

const statusStyles: Record<DisplayStatus, { badge: "success" | "secondary" | "warning" | "destructive"; icon: React.ElementType; dot: string }> = {
  Upcoming: { badge: "warning", icon: Clock, dot: "bg-warning" },
  Completed: { badge: "success", icon: CheckCircle2, dot: "bg-accent" },
  Cancelled: { badge: "destructive", icon: XCircle, dot: "bg-danger" },
};

function mapStatus(apiStatus: AppointmentStatus): DisplayStatus {
  switch (apiStatus) {
    case "scheduled":
    case "confirmed":
    case "in_progress":
      return "Upcoming";
    case "completed":
      return "Completed";
    case "cancelled":
    case "no_show":
      return "Cancelled";
  }
}

function toDisplay(apt: NonNullable<ReturnType<typeof useAppointments>["data"]>[number]): AppointmentDisplay {
  const patientName = apt.patient?.user
    ? `${apt.patient.user.first_name} ${apt.patient.user.last_name}`
    : apt.patient_id;
  const doctorName = apt.staff?.user
    ? `${apt.staff.user.first_name} ${apt.staff.user.last_name}`
    : apt.staff_id;
  return {
    id: apt.id,
    patient: patientName,
    doctor: doctorName,
    date: apt.appointment_date,
    time: apt.start_time?.slice(0, 5) || "—",
    department: apt.staff?.department || "General",
    status: mapStatus(apt.status),
  };
}

export default function AppointmentsPage() {
  const [tab, setTab] = useState("all");
  const { data: appointmentsData, loading } = useAppointments();

  const appointments = useMemo(() => {
    if (!appointmentsData) return [];
    return appointmentsData.map(toDisplay);
  }, [appointmentsData]);

  const filtered = appointments.filter((a) => {
    if (tab === "all") return true;
    return a.status.toLowerCase() === tab;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-sm text-text-secondary mt-1">
            Schedule and manage patient appointments
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          New Appointment
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-text-secondary">
                  No {tab === "all" ? "" : tab} appointments found.
                </div>
              ) : (
                filtered.map((apt) => {
                  const style = statusStyles[apt.status];
                  const Icon = style.icon;
                  return (
                    <Card key={apt.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Time indicator */}
                          <div className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-1 sm:w-20 shrink-0">
                            <div
                              className={cn(
                                "flex items-center justify-center rounded-full",
                                apt.status === "Upcoming"
                                  ? "bg-primary-lighter text-primary"
                                  : apt.status === "Completed"
                                  ? "bg-accent-light text-accent"
                                  : "bg-danger-light text-danger"
                              )}
                            >
                              <Icon className="size-5" />
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {apt.time}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                {apt.patient}
                              </span>
                              <Badge
                                variant={style.badge}
                                className="text-[10px]"
                              >
                                {apt.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-text-secondary flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="size-3.5" />
                                {apt.doctor}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3.5" />
                                {formatDate(apt.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Stethoscope className="size-3.5" />
                                {apt.department}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          {apt.status === "Upcoming" && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="success"
                                className="h-8 text-xs"
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-accent"
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-danger"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                          {apt.status === "Completed" && (
                            <Badge variant="outline" className="shrink-0 text-[11px]">
                              Done
                            </Badge>
                          )}
                          {apt.status === "Cancelled" && (
                            <Badge variant="destructive" className="shrink-0 text-[11px]">
                              Cancelled
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
