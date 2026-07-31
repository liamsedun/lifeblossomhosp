"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, ChevronDown, Check, ArrowLeft, User as UserIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import type { Dependant } from "@/lib/api-types";

interface StaffDoctor {
  id: string;
  staff_number: string;
  specialization: string | null;
  department: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const departments = [
  "General Consultation",
  "Cardiology",
  "Dermatology",
  "Maternity & Antenatal",
  "Pediatrics",
  "Orthopedics",
  "Diagnostics & Lab",
  "Pharmacy",
];

const timeSlots = [
  { label: "Morning", start: "09:00", end: "12:00", available: true },
  { label: "Afternoon", start: "13:00", end: "16:00", available: true },
  { label: "Evening", start: "17:00", end: "19:00", available: false },
];

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 overflow-hidden",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.04] to-transparent" />
      {children}
    </div>
  );
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<StaffDoctor[]>([]);
  const [dependants, setDependants] = useState<Dependant[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const selfPatientIdRef = useRef<string | null>(null);
  const [patientLabel, setPatientLabel] = useState("Self");
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [department, setDepartment] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [reason, setReason] = useState("");
  const [showDept, setShowDept] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDoctors(json.data);
      })
      .catch(console.error)
      .finally(() => setLoadingDoctors(false));

    fetch("/api/patients/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          selfPatientIdRef.current = json.data.id;
          if (!patientId) setPatientId(json.data.id);
        }
      })
      .catch(console.error);

    fetch("/api/dependants")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDependants(json.data.dependants || []);
      })
      .catch(console.error);

    // Support /patient/book?for=<dependantId> (from dependant profile)
    const forId = new URLSearchParams(window.location.search).get("for");
    if (forId) {
      fetch("/api/dependants")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const match = (json.data.dependants || []).find((d: Dependant) => d.id === forId);
            if (match) {
              setPatientId(match.id);
              setPatientLabel(match.full_name);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  const selectPatient = (id: string, label: string) => {
    setPatientId(id);
    setPatientLabel(label);
  };

  const selectSelf = () => {
    if (selfPatientIdRef.current) {
      setPatientId(selfPatientIdRef.current);
      setPatientLabel("Self");
    }
  };

  const handleSubmit = async () => {
    if (!patientId || !doctorId || !date || !timeSlot) return;
    setError("");
    setSaving(true);
    try {
      const slot = timeSlots.find((s) => s.label === timeSlot);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_date: date,
          start_time: slot?.start || "09:00",
          end_time: slot?.end || "12:00",
          reason: reason || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        setError(json.error || "Failed to book appointment");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center pt-16 space-y-4">
        <div className="w-16 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Appointment Requested!</h2>
        <p className="text-sm text-white/50 text-center max-w-xs">
          Your appointment has been submitted. You&apos;ll receive a confirmation shortly.
        </p>
        <Link
          href="/patient/appointments"
          className="mt-2 h-10 px-6 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl inline-flex items-center gap-2 hover:shadow-lg hover:shadow-[#e0a84a]/20 transition-all"
        >
          View Appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/patient" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-white/50 hover:text-white transition-colors" />
        </Link>
        <h2 className="text-xl font-bold text-white">Book an Appointment</h2>
      </div>

      <GlassCard className="space-y-5">
        {dependants.length > 0 && (
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Booking For</label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={selectSelf}
                disabled={!patientId}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3.5 h-10 rounded-xl border text-xs font-medium transition-all",
                  patientLabel === "Self"
                    ? "border-[#e0a84a]/40 bg-[#e0a84a]/10 text-[#e0a84a]"
                    : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-[#e0a84a]/30"
                )}
              >
                <UserIcon className="w-3.5 h-3.5" />
                {user ? `${user.first_name} (Self)` : "Self"}
              </button>
              {dependants.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectPatient(d.id, d.full_name)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3.5 h-10 rounded-xl border text-xs font-medium transition-all",
                    patientLabel === d.full_name
                      ? "border-[#e0a84a]/40 bg-[#e0a84a]/10 text-[#e0a84a]"
                      : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-[#e0a84a]/30"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  {d.full_name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Department / Service</label>
          <button
            onClick={() => { setShowDept(!showDept); setShowDoc(false); }}
            className="w-full h-11 flex items-center justify-between px-3 border border-white/[0.08] bg-white/[0.04] rounded-xl text-sm text-left hover:border-[#e0a84a]/40 transition-all"
          >
            <span className={department ? "text-white" : "text-white/30"}>{department || "Select department"}</span>
            <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", showDept && "rotate-180")} />
          </button>
          {showDept && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-[#0d1322]/95 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => { setDepartment(d); setShowDept(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.04] hover:text-white transition-colors"
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Doctor</label>
          <button
            onClick={() => { setShowDoc(!showDoc); setShowDept(false); }}
            className="w-full h-11 flex items-center justify-between px-3 border border-white/[0.08] bg-white/[0.04] rounded-xl text-sm text-left hover:border-[#e0a84a]/40 transition-all"
          >
            <span className={doctorId ? "text-white" : "text-white/30"}>{doctorName || "Select doctor"}</span>
            <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", showDoc && "rotate-180")} />
          </button>
          {showDoc && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-[#0d1322]/95 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {loadingDoctors ? (
                <div className="px-3 py-2.5 text-sm text-white/40">Loading doctors...</div>
              ) : doctors.length === 0 ? (
                <div className="px-3 py-2.5 text-sm text-white/40">No doctors available</div>
              ) : doctors.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setDoctorId(d.id); setDoctorName(`Dr. ${d.user.first_name} ${d.user.last_name.charAt(0)}.`); setShowDoc(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-white">{`Dr. ${d.user.first_name} ${d.user.last_name}`}</span>
                  <span className="text-white/40 text-xs ml-2">{d.specialization || d.department || "General"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 pl-9 pr-3 border border-white/[0.08] bg-white/[0.04] rounded-xl text-sm text-white hover:border-[#e0a84a]/40 transition-all focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/20 focus:border-[#e0a84a]/40 [color-scheme:dark]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Time Slot</label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.label}
                disabled={!slot.available}
                onClick={() => setTimeSlot(slot.label)}
                className={cn(
                  "flex flex-col items-center py-3 px-1 rounded-xl border text-xs transition-all",
                  timeSlot === slot.label
                    ? "border-[#e0a84a]/40 bg-[#e0a84a]/10 text-[#e0a84a] shadow-lg shadow-[#e0a84a]/5"
                    : slot.available
                    ? "border-white/[0.08] text-white/60 hover:border-[#e0a84a]/30 hover:bg-white/[0.04]"
                    : "border-white/[0.04] text-white/20 bg-white/[0.02] cursor-not-allowed"
                )}
              >
                <Clock className={cn("w-4 h-4 mb-1", timeSlot === slot.label ? "text-[#e0a84a]" : "text-white/40")} />
                <span className="font-medium">{slot.label}</span>
                <span className="text-[10px] mt-0.5">{slot.start} – {slot.end}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Reason for Visit</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Briefly describe your symptoms or reason for visit..."
            className="w-full px-3 py-2.5 border border-white/[0.08] bg-white/[0.04] rounded-xl text-sm text-white placeholder:text-white/30 resize-none hover:border-[#e0a84a]/40 transition-all focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/20 focus:border-[#e0a84a]/40"
          />
        </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!department || !doctorId || !date || !timeSlot || saving}
            className="w-full h-12 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {saving ? "Booking..." : "Confirm Booking"}
          </button>
      </GlassCard>
    </div>
  );
}
