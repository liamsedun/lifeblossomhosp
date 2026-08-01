"use client";

import { useState, useEffect } from "react";
import {
  Plus, Loader2, FileText, ChevronDown, ChevronUp,
  Calendar, User, Activity, TestTube, Stethoscope,
  Pill, HeartPulse, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { DoctorNote, DoctorNoteVitals, DoctorNoteTests, DoctorNoteDiagnosis, DoctorNoteMedication } from "@/lib/api-types";

interface DoctorNotesSectionProps {
  patientId: string;
}

type NoteForm = {
  doctor_id: string;
  appointment_id: string;
  visit_date: string;
  vitals: DoctorNoteVitals;
  tests_procedures: DoctorNoteTests;
  clinical_findings: string;
  diagnosis: DoctorNoteDiagnosis;
  medications: DoctorNoteMedication[];
  treatment_recommendations: string;
  next_visit_date: string;
  next_visit_reason: string;
};

const emptyForm: NoteForm = {
  doctor_id: "", appointment_id: "", visit_date: new Date().toISOString().split("T")[0],
  vitals: {}, tests_procedures: {}, clinical_findings: "",
  diagnosis: {}, medications: [], treatment_recommendations: "",
  next_visit_date: "", next_visit_reason: "",
};

const vitalFields: { key: keyof DoctorNoteVitals; label: string }[] = [
  { key: "bp", label: "Blood Pressure (BP)" },
  { key: "weight", label: "Weight" },
  { key: "height", label: "Height" },
  { key: "temperature", label: "Temperature" },
  { key: "cholesterol", label: "Cholesterol Level" },
  { key: "heart_rate", label: "Heart Rate" },
  { key: "respiratory_rate", label: "Respiratory Rate" },
  { key: "allergies", label: "Allergies" },
];

const testFields: { key: keyof DoctorNoteTests; label: string }[] = [
  { key: "ecg", label: "ECG" },
  { key: "xray", label: "X-Ray" },
  { key: "blood_test", label: "Blood Test" },
  { key: "urine_test", label: "Urine Test" },
  { key: "saliva_test", label: "Saliva Test" },
  { key: "other_tests", label: "Other Tests (specify)" },
];

function NoteCard({ note, onEdit, onDelete, isClinician }: {
  note: DoctorNote; onEdit: () => void; onDelete: () => void; isClinician: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const v = note.vitals || {};
  const t = note.tests_procedures || {};
  const d = note.diagnosis || {};
  const hasContent = note.clinical_findings || d.primary || (note.medications && note.medications.length > 0) || note.treatment_recommendations;

  return (
    <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="size-4 text-[#e0a84a] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Visit — {formatDate(note.visit_date)}
              </p>
              {note.doctor?.user && (
                <p className="text-xs text-white/40 truncate">
                  {note.doctor.user.first_name} {note.doctor.user.last_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="text-[10px] bg-[#e0a84a]/10 text-[#e0a84a] border-[#e0a84a]/20">
              {formatDate(note.created_at)}
            </Badge>
            <button onClick={() => setExpanded(!expanded)} className="text-white/30 hover:text-white p-1">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
        </div>

        {!expanded && hasContent && (
          <p className="mt-2 text-xs text-white/50 line-clamp-2">
            {d.primary ? `Dx: ${d.primary}` : note.clinical_findings?.slice(0, 120) || "No details"}
          </p>
        )}

        {expanded && (
          <div className="mt-4 space-y-4 text-sm">
            {/* Vital Signs */}
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a] mb-2">
                <Activity className="size-3.5" /> Vital Signs & Measurements
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/70">
                {vitalFields.map((f) => {
                  const val = v[f.key];
                  return val ? (
                    <p key={f.key}><span className="text-white/40">{f.label}:</span> {val}</p>
                  ) : (
                    <p key={f.key} className="text-white/20"><span className="text-white/40">{f.label}:</span> Not Provided</p>
                  );
                })}
              </div>
            </div>

            {/* Tests */}
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a] mb-2">
                <TestTube className="size-3.5" /> Tests / Procedures Conducted
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/70">
                {testFields.map((f) => {
                  const val = t[f.key];
                  return val ? (
                    <p key={f.key}><span className="text-white/40">{f.label}:</span> {val}</p>
                  ) : (
                    <p key={f.key} className="text-white/20"><span className="text-white/40">{f.label}:</span> Not Provided</p>
                  );
                })}
              </div>
            </div>

            {/* Clinical Findings */}
            {note.clinical_findings && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a] mb-1">
                  <Stethoscope className="size-3.5" /> Clinical Findings / Observations
                </h4>
                <p className="text-white/70 whitespace-pre-wrap">{note.clinical_findings}</p>
              </div>
            )}

            {/* Diagnosis */}
            {(d.primary || d.secondary?.length || d.suspected?.length) && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a] mb-1">
                  <ClipboardList className="size-3.5" /> Diagnosis / Assessment
                </h4>
                {d.primary && <p className="text-white/70"><span className="text-white/40">Primary:</span> {d.primary}</p>}
                {d.secondary && d.secondary.length > 0 && (
                  <p className="text-white/70"><span className="text-white/40">Secondary:</span> {d.secondary.join(", ")}</p>
                )}
                {d.suspected && d.suspected.length > 0 && (
                  <p className="text-white/70"><span className="text-white/40">Suspected:</span> {d.suspected.join(", ")}</p>
                )}
              </div>
            )}

            {/* Medications */}
            {note.medications && note.medications.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a] mb-2">
                  <Pill className="size-3.5" /> Medications Prescribed
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-white/70">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-white/40">
                        <th className="text-left py-1 pr-2">Drug</th>
                        <th className="text-left py-1 pr-2">Dosage</th>
                        <th className="text-left py-1 pr-2">Frequency</th>
                        <th className="text-left py-1">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {note.medications.map((m, i) => (
                        <tr key={i} className="border-b border-white/[0.04]">
                          <td className="py-1 pr-2 text-white">{m.drug_name}</td>
                          <td className="py-1 pr-2">{m.dosage}</td>
                          <td className="py-1 pr-2">{m.frequency}</td>
                          <td className="py-1">{m.duration || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Treatment */}
            {note.treatment_recommendations && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a] mb-1">
                  <HeartPulse className="size-3.5" /> Treatment / Recommendations
                </h4>
                <p className="text-white/70 whitespace-pre-wrap">{note.treatment_recommendations}</p>
              </div>
            )}

            {/* Next Visit */}
            {note.next_visit_date && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a] mb-1">
                  <Calendar className="size-3.5" /> Next Visit
                </h4>
                <p className="text-white/70">Date: {formatDate(note.next_visit_date)}</p>
                {note.next_visit_reason && <p className="text-white/70">Reason: {note.next_visit_reason}</p>}
              </div>
            )}

            {/* Action buttons */}
            {isClinician && (
              <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                <Button size="sm" variant="ghost" onClick={onEdit}
                  className="text-xs text-[#e0a84a]/70 hover:text-[#e0a84a] h-7 px-2">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete}
                  className="text-xs text-red-400 hover:text-red-300 h-7 px-2">
                  Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MedicationRow({ med, index, onChange, onRemove }: {
  med: DoctorNoteMedication; index: number;
  onChange: (i: number, m: DoctorNoteMedication) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-end p-2 rounded border border-white/[0.06] bg-white/[0.02]">
      <div className="flex-1 min-w-[120px]">
        <p className="text-[10px] text-white/40">Drug Name</p>
        <Input value={med.drug_name} onChange={(e) => onChange(index, { ...med, drug_name: e.target.value })}
          className="h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white" placeholder="e.g. Amoxicillin" />
      </div>
      <div className="w-20">
        <p className="text-[10px] text-white/40">Dosage</p>
        <Input value={med.dosage} onChange={(e) => onChange(index, { ...med, dosage: e.target.value })}
          className="h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white" placeholder="e.g. 500mg" />
      </div>
      <div className="w-24">
        <p className="text-[10px] text-white/40">Frequency</p>
        <Input value={med.frequency} onChange={(e) => onChange(index, { ...med, frequency: e.target.value })}
          className="h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white" placeholder="e.g. 3x daily" />
      </div>
      <div className="w-20">
        <p className="text-[10px] text-white/40">Duration</p>
        <Input value={med.duration} onChange={(e) => onChange(index, { ...med, duration: e.target.value })}
          className="h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white" placeholder="e.g. 7 days" />
      </div>
      <Button type="button" variant="ghost" onClick={() => onRemove(index)}
        className="h-8 w-8 text-red-400 hover:text-red-300 p-0">
        &times;
      </Button>
    </div>
  );
}

export default function DoctorNotesSection({ patientId }: DoctorNotesSectionProps) {
  const [notes, setNotes] = useState<DoctorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NoteForm>(emptyForm);
  const [isClinician, setIsClinician] = useState(false);

  useEffect(() => {
    loadNotes();
    checkRole();
  }, [patientId]);

  async function checkRole() {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const res = await fetch("/api/doctor-notes/check-role");
        const json = await res.json();
        setIsClinician(json.data?.isClinician || false);
      }
    } catch { /* read-only fallback */ }
  }

  async function loadNotes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/doctor-notes?patient_id=${patientId}`);
      const json = await res.json();
      if (json.success) setNotes(json.data || []);
      else setError(json.error || "Failed to load notes");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: any = { ...form, patient_id: patientId };
      if (!payload.doctor_id) delete payload.doctor_id;
      if (!payload.appointment_id) delete payload.appointment_id;
      if (!payload.next_visit_date) { delete payload.next_visit_date; delete payload.next_visit_reason; }

      const res = await fetch("/api/doctor-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setShowForm(false);
      setForm(emptyForm);
      loadNotes();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  function updateVital(key: keyof DoctorNoteVitals, value: string) {
    setForm({ ...form, vitals: { ...form.vitals, [key]: value || undefined } });
  }

  function updateTest(key: keyof DoctorNoteTests, value: string) {
    setForm({ ...form, tests_procedures: { ...form.tests_procedures, [key]: value || undefined } });
  }

  function updateDiagnosisField(key: "primary" | "secondary" | "suspected", value: string) {
    const d = form.diagnosis;
    if (key === "primary") setForm({ ...form, diagnosis: { ...d, primary: value } });
    else if (key === "secondary") setForm({ ...form, diagnosis: { ...d, secondary: value ? value.split(",").map((s) => s.trim()) : [] } });
    else setForm({ ...form, diagnosis: { ...d, suspected: value ? value.split(",").map((s) => s.trim()) : [] } });
  }

  function addMedication() {
    setForm({
      ...form,
      medications: [...form.medications, { drug_name: "", dosage: "", frequency: "", duration: "" }],
    });
  }

  function updateMedication(i: number, med: DoctorNoteMedication) {
    const meds = [...form.medications];
    meds[i] = med;
    setForm({ ...form, medications: meds });
  }

  function removeMedication(i: number) {
    setForm({ ...form, medications: form.medications.filter((_, idx) => idx !== i) });
  }

  async function handleDelete(noteId: string) {
    if (!confirm("Delete this clinical note? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/doctor-notes/${noteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      loadNotes();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">
          {notes.length} clinical note{notes.length !== 1 ? "s" : ""} on record
        </p>
        {isClinician && (
          <Button onClick={() => setShowForm(true)} size="sm"
            className="h-7 text-xs bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
            <Plus className="size-3 mr-1" />New Note
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-[#e0a84a]" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-8">No clinical notes recorded for this patient.</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isClinician={isClinician}
              onEdit={() => {/* future: inline edit */}}
              onDelete={() => handleDelete(note.id)}
            />
          ))}
        </div>
      )}

      {/* New Note Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(o); }}>
        <DialogContent className="sm:max-w-2xl border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Doctor's Clinical Visit Note</DialogTitle>
            <DialogDescription className="text-white/50">
              Fill out the structured clinical note. All fields left blank will be recorded as "Not Provided".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Visit Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-white/50">Visit Date</p>
                <Input type="date" value={form.visit_date}
                  onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white" />
              </div>
            </div>

            {/* 1. Vital Signs */}
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#e0a84a] mb-2">
                <Activity className="size-4" /> 1. Vital Signs & Measurements
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {vitalFields.map((f) => (
                  <div key={f.key}>
                    <p className="text-[10px] text-white/40">{f.label}</p>
                    <Input value={form.vitals[f.key] || ""}
                      onChange={(e) => updateVital(f.key, e.target.value)}
                      className="h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white"
                      placeholder={f.key === "allergies" ? "e.g. Penicillin" : f.key === "bp" ? "e.g. 120/80" : "—"} />
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Tests */}
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#e0a84a] mb-2">
                <TestTube className="size-4" /> 2. Tests / Procedures Conducted
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {testFields.map((f) => (
                  <div key={f.key}>
                    <p className="text-[10px] text-white/40">{f.label}</p>
                    <Input value={form.tests_procedures[f.key] || ""}
                      onChange={(e) => updateTest(f.key, e.target.value)}
                      className="h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white"
                      placeholder="Result / Notes" />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Clinical Findings */}
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#e0a84a] mb-1">
                <Stethoscope className="size-4" /> 3. Clinical Findings / Observations
              </h3>
              <Textarea value={form.clinical_findings}
                onChange={(e) => setForm({ ...form, clinical_findings: e.target.value })}
                className="min-h-[80px] bg-white/[0.04] border-white/[0.08] text-white text-sm"
                placeholder="Patient complaints, physical examination findings, notable abnormalities, progress compared to previous visits..." />
            </div>

            {/* 4. Diagnosis */}
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#e0a84a] mb-2">
                <ClipboardList className="size-4" /> 4. Diagnosis / Assessment
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-white/50">Primary Diagnosis</p>
                  <Input value={form.diagnosis.primary || ""}
                    onChange={(e) => updateDiagnosisField("primary", e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="e.g. Type 2 Diabetes Mellitus" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Secondary Conditions (comma-separated)</p>
                  <Input value={(form.diagnosis.secondary || []).join(", ")}
                    onChange={(e) => updateDiagnosisField("secondary", e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="e.g. Hypertension, Obesity" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Suspected Conditions (comma-separated)</p>
                  <Input value={(form.diagnosis.suspected || []).join(", ")}
                    onChange={(e) => updateDiagnosisField("suspected", e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="e.g. Sleep Apnea" />
                </div>
              </div>
            </div>

            {/* 5. Medications */}
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#e0a84a] mb-2">
                <Pill className="size-4" /> 5. Medications Prescribed
              </h3>
              <div className="space-y-2">
                {form.medications.map((med, i) => (
                  <MedicationRow key={i} med={med} index={i}
                    onChange={updateMedication} onRemove={removeMedication} />
                ))}
                <Button type="button" variant="ghost" onClick={addMedication} size="sm"
                  className="text-xs text-[#e0a84a]/70 hover:text-[#e0a84a] h-7">
                  + Add Medication
                </Button>
              </div>
            </div>

            {/* 6. Treatment */}
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#e0a84a] mb-1">
                <HeartPulse className="size-4" /> 6. Treatment / Recommendations
              </h3>
              <Textarea value={form.treatment_recommendations}
                onChange={(e) => setForm({ ...form, treatment_recommendations: e.target.value })}
                className="min-h-[80px] bg-white/[0.04] border-white/[0.08] text-white text-sm"
                placeholder="Lifestyle advice, dietary recommendations, follow-up tests, referrals..." />
            </div>

            {/* 7. Next Visit */}
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#e0a84a] mb-2">
                <Calendar className="size-4" /> 7. Next Visit
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-white/50">Next Appointment Date</p>
                  <Input type="date" value={form.next_visit_date}
                    onChange={(e) => setForm({ ...form, next_visit_date: e.target.value })}
                    className="bg-white/[0.04] border-white/[0.08] text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Reason for Follow-up</p>
                  <Input value={form.next_visit_reason}
                    onChange={(e) => setForm({ ...form, next_visit_reason: e.target.value })}
                    className="bg-white/[0.04] border-white/[0.08] text-white" placeholder="e.g. Review test results" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline"
                  className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                Save Clinical Note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
