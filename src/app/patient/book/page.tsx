"use client";

import { useState } from "react";
import { Calendar, Clock, ChevronDown, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

const doctors = [
  { name: "Dr. Adebayo O.", specialty: "General Practitioner" },
  { name: "Dr. Eze C.", specialty: "Cardiologist" },
  { name: "Dr. Okonkwo N.", specialty: "Obstetrician" },
  { name: "Dr. Bello F.", specialty: "Dermatologist" },
  { name: "Dr. Musa A.", specialty: "Pediatrician" },
];

const timeSlots = [
  { label: "Morning", time: "9:00 AM - 12:00 PM", available: true },
  { label: "Afternoon", time: "1:00 PM - 4:00 PM", available: true },
  { label: "Evening", time: "5:00 PM - 7:00 PM", available: false },
];

export default function BookAppointmentPage() {
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [reason, setReason] = useState("");
  const [showDept, setShowDept] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center pt-16 space-y-4">
        <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center">
          <Check className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Appointment Requested!</h2>
        <p className="text-sm text-text-secondary text-center max-w-xs">
          Your appointment has been submitted. You&apos;ll receive a confirmation shortly.
        </p>
        <Link
          href="/patient/appointments"
          className="mt-2 h-10 px-6 bg-primary text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 hover:bg-primary-dark transition-colors"
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
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <h2 className="text-xl font-bold text-foreground">Book an Appointment</h2>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 card-shadow space-y-4">
        <div className="relative">
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Department / Service</label>
          <button
            onClick={() => { setShowDept(!showDept); setShowDoc(false); }}
            className="w-full h-10 flex items-center justify-between px-3 border border-border rounded-lg text-sm text-left hover:border-primary/40 transition-colors"
          >
            <span className={department ? "text-foreground" : "text-text-secondary"}>{department || "Select department"}</span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>
          {showDept && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => { setDepartment(d); setShowDept(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Doctor</label>
          <button
            onClick={() => { setShowDoc(!showDoc); setShowDept(false); }}
            className="w-full h-10 flex items-center justify-between px-3 border border-border rounded-lg text-sm text-left hover:border-primary/40 transition-colors"
          >
            <span className={doctor ? "text-foreground" : "text-text-secondary"}>{doctor || "Select doctor"}</span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>
          {showDoc && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg">
              {doctors.map((d) => (
                <button
                  key={d.name}
                  onClick={() => { setDoctor(d.name); setShowDoc(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <span className="text-foreground">{d.name}</span>
                  <span className="text-text-secondary text-xs ml-2">{d.specialty}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 pl-9 pr-3 border border-border rounded-lg text-sm text-foreground hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Time Slot</label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.label}
                disabled={!slot.available}
                onClick={() => setTimeSlot(slot.label)}
                className={cn(
                  "flex flex-col items-center py-2.5 px-1 rounded-lg border text-xs transition-colors",
                  timeSlot === slot.label
                    ? "border-primary bg-primary-lighter text-primary"
                    : slot.available
                    ? "border-border text-foreground hover:border-primary/40"
                    : "border-border text-text-secondary/50 bg-muted/50 cursor-not-allowed"
                )}
              >
                <Clock className="w-3.5 h-3.5 mb-0.5" />
                <span className="font-medium">{slot.label}</span>
                <span className="text-[10px] mt-0.5">{slot.time}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Reason for Visit</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Briefly describe your symptoms or reason for visit..."
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-foreground placeholder:text-text-secondary resize-none hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!department || !doctor || !date || !timeSlot}
          className="w-full h-12 bg-primary text-white text-sm font-semibold rounded-xl shadow-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          Confirm Booking
        </button>
      </div>
    </div>
  );
}
