"use client";

import { useState } from "react";
import { FileText, HeartPulse, FlaskRound, Pill, ChevronDown, ChevronUp, Calendar, User, Stethoscope, Syringe, Scan } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMedicalRecords } from "@/hooks/use-medical-records";
import type { MedicalRecord } from "@/lib/api-types";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  diagnosis: { icon: HeartPulse, color: "text-primary", bg: "bg-primary-lighter" },
  lab_result: { icon: FlaskRound, color: "text-accent", bg: "bg-accent-light" },
  prescription: { icon: Pill, color: "text-warning", bg: "bg-warning-light" },
  surgery_report: { icon: Stethoscope, color: "text-danger", bg: "bg-danger-light" },
  vaccination: { icon: Syringe, color: "text-secondary", bg: "bg-secondary-light" },
  imaging: { icon: Scan, color: "text-primary", bg: "bg-primary-lighter" },
};

const typeLabels: Record<string, string> = {
  diagnosis: "Diagnosis",
  lab_result: "Lab",
  prescription: "Prescription",
  surgery_report: "Surgery",
  vaccination: "Vaccination",
  imaging: "Imaging",
};

export default function RecordsPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { data: records, loading } = useMedicalRecords();

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Medical Records</h2>
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 card-shadow animate-pulse">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sortedRecords = (records ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getDoctorName = (record: MedicalRecord) => {
    if (record.staff?.user) {
      return `Dr. ${record.staff.user.first_name} ${record.staff.user.last_name.charAt(0)}.`;
    }
    return record.staff_id || "Doctor";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Medical Records</h2>
        <FileText className="w-5 h-5 text-primary" />
      </div>

      {sortedRecords.length > 0 ? (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-4">
            {sortedRecords.map((record) => {
              const config = typeConfig[record.record_type] || { icon: FileText, color: "text-text-secondary", bg: "bg-muted" };
              const isOpen = expanded[record.id];
              const Icon = config.icon;

              return (
                <div key={record.id} className="relative pl-10">
                  <div className={cn("absolute left-2.5 w-5 h-5 rounded-full flex items-center justify-center z-10", config.bg)}>
                    <Icon className={cn("w-3 h-3", config.color)} />
                  </div>

                  <button
                    onClick={() => toggle(record.id)}
                    className={cn(
                      "w-full text-left bg-card border border-border rounded-xl p-4 card-shadow transition-all",
                      "hover:card-shadow-hover hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", config.bg, config.color)}>
                            {typeLabels[record.record_type] || record.record_type}
                          </span>
                          <span className="text-[11px] text-text-secondary flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(record.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">{record.title}</h4>
                        <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getDoctorName(record)}
                        </p>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-text-secondary shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-secondary shrink-0 mt-1" />
                      )}
                    </div>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-text-secondary leading-relaxed">{record.notes || record.description || "No additional notes."}</p>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 card-shadow text-center">
          <FileText className="w-8 h-8 text-text-secondary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">No medical records found.</p>
        </div>
      )}
    </div>
  );
}
