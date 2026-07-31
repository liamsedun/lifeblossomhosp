"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, Calendar, CreditCard, FileText, HeartPulse,
  Pencil, Trash2, X, Droplet, Dna, Phone, Users, Stethoscope,
  CheckCircle2, Clock, PlusCircle, Wallet, ShieldCheck, Baby, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dependant, MedicalRecord, Invoice, Appointment } from "@/lib/api-types";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENOTYPES = ["AA", "AS", "SS", "AC", "SC", "CC"];
const RELATIONSHIPS = ["Child", "Spouse", "Parent", "Sibling", "Grandparent", "Other"];
const PAYMENT_METHODS = ["cash", "card", "transfer", "insurance", "mobile_money"];

const recordTypeLabels: Record<string, string> = {
  diagnosis: "Diagnosis", lab_result: "Lab Result", prescription: "Prescription",
  surgery_report: "Surgery Report", vaccination: "Vaccination", imaging: "Imaging",
};

const appointmentStatusStyles: Record<string, string> = {
  scheduled: "bg-blue-500/10 border-blue-500/25 text-blue-400",
  confirmed: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  in_progress: "bg-amber-500/10 border-amber-500/25 text-amber-400",
  completed: "bg-white/[0.06] border-white/10 text-white/60",
  cancelled: "bg-rose-500/10 border-rose-500/25 text-rose-400",
  no_show: "bg-rose-500/10 border-rose-500/25 text-rose-400",
};

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

const inputCls =
  "w-full h-11 px-3 border border-white/[0.08] bg-white/[0.04] rounded-xl text-sm text-white placeholder:text-white/30 hover:border-[#e0a84a]/40 transition-all focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/20 focus:border-[#e0a84a]/40 [color-scheme:dark]";

const selectCls =
  "w-full h-11 px-3 border border-white/[0.08] bg-[#0d1322] rounded-xl text-sm text-white hover:border-[#e0a84a]/40 transition-all focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/20 focus:border-[#e0a84a]/40 [color-scheme:dark]";

const textareaCls =
  "w-full px-3 py-2.5 border border-white/[0.08] bg-white/[0.04] rounded-xl text-sm text-white placeholder:text-white/30 resize-none hover:border-[#e0a84a]/40 transition-all focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/20 focus:border-[#e0a84a]/40";

type Tab = "biodata" | "records" | "bills" | "appointments";

export default function DependantProfilePage() {
  const params = useParams<{ id: string }>();
  const dependantId = params.id;

  const [dependant, setDependant] = useState<Dependant | null>(null);
  const [siblings, setSiblings] = useState<Dependant[]>([]);
  const [tab, setTab] = useState<Tab>("biodata");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const load = useCallback(() => {
    fetch(`/api/dependants/${dependantId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDependant(json.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));

    fetch("/api/dependants")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSiblings((json.data.dependants || []).filter((d: Dependant) => d.id !== dependantId));
      })
      .catch(() => {});
  }, [dependantId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!dependantId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/medical-records?patient_id=${dependantId}&page_size=50`).then((r) => r.json()),
      fetch(`/api/invoices?patient_id=${dependantId}&page_size=50`).then((r) => r.json()),
      fetch(`/api/appointments?patient_id=${dependantId}&page_size=50`).then((r) => r.json()),
    ])
      .then(([rec, inv, appt]) => {
        if (rec.success) setRecords(rec.data || []);
        if (inv.success) setInvoices(inv.data || []);
        if (appt.success) setAppointments(appt.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dependantId]);

  const age = (dob: string | null) => {
    if (!dob) return null;
    const d = new Date(dob);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  };

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 space-y-3 px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h2 className="text-lg font-bold text-white">Dependant not found</h2>
        <p className="text-sm text-white/50">This dependant may have been removed from your family account.</p>
        <Link href="/patient/dependants" className="mt-2 h-10 px-5 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dependants
        </Link>
      </div>
    );
  }

  const outstanding = invoices
    .filter((i) => i.status === "pending" || i.status === "partially_paid")
    .reduce((s, i) => s + (i.total_amount - (i.paid_amount || 0)), 0);
  const a = dependant ? age(dependant.date_of_birth) : null;

  const tabs: Array<{ key: Tab; label: string; icon: React.ElementType; count?: number }> = [
    { key: "biodata", label: "Biodata", icon: HeartPulse },
    { key: "records", label: "Medical Records", icon: Stethoscope, count: records.length },
    { key: "bills", label: "Bills", icon: CreditCard, count: invoices.length },
    { key: "appointments", label: "Appointments", icon: Calendar, count: appointments.length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/patient/dependants" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-white/50 hover:text-white transition-colors" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{dependant?.full_name || "Dependant"}</h2>
          <p className="text-xs text-[#e0a84a] font-semibold">
            {dependant?.family_code} · {dependant?.patient_number}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowEdit(true)}
            className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-[#e0a84a] hover:border-[#e0a84a]/40 transition-all"
            title="Edit dependant"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-rose-400 hover:border-rose-500/40 transition-all"
            title="Remove dependant"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick switch */}
      {siblings.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`/patient/dependants/${s.id}`}
              className="shrink-0 flex items-center gap-2 pl-2 pr-3 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-[#e0a84a]/40 transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-[#e0a84a]/15 border border-[#e0a84a]/25 flex items-center justify-center text-[9px] font-bold text-[#e0a84a]">
                {s.full_name.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs text-white/70 whitespace-nowrap">{s.full_name.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Profile card */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-[#0b2a4a] via-[#0e3a63] to-[#0d5f7a] p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-lg font-bold text-[#e0a84a] shrink-0">
              {dependant?.full_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white truncate">{dependant?.full_name || "Loading..."}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e0a84a]/15 border border-[#e0a84a]/25 text-[10px] font-semibold text-[#e0a84a] capitalize">
                  <HeartPulse className="w-3 h-3" />{dependant?.relationship || "Family Member"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-medium text-white/70 capitalize">
                  <Users className="w-3 h-3" />{dependant?.gender || "—"}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                  dependant?.status === "needs_attention"
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                )}>
                  {dependant?.status === "needs_attention" ? <AlertTriangle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                  {dependant?.status === "needs_attention" ? "Needs Attention" : "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {dependant?.allergies && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/25 px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400">Allergy Alert</p>
              <p className="text-xs text-amber-300/80 mt-0.5">{dependant.allergies}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 p-4">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Outstanding</p>
            <p className={cn("text-sm font-bold mt-1", outstanding > 0 ? "text-rose-400" : "text-emerald-400")}>
              ₦{outstanding.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Records</p>
            <p className="text-sm font-bold text-white mt-1">{records.length}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Appointments</p>
            <p className="text-sm font-bold text-white mt-1">{appointments.length}</p>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-medium transition-all",
              tab === key
                ? "border-[#e0a84a]/40 bg-[#e0a84a]/10 text-[#e0a84a]"
                : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white/80"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="leading-tight text-center">{label}</span>
            {count !== undefined && count > 0 && (
              <span className="text-[9px] text-white/35">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "biodata" && dependant && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-white mb-3">Biodata</h3>
          <div className="space-y-2.5">
            {[
              { icon: Users, label: "Full Name", value: dependant.full_name },
              { icon: Calendar, label: "Date of Birth", value: dependant.date_of_birth
                ? `${new Date(dependant.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} (${a} yrs)`
                : "—" },
              { icon: Users, label: "Sex", value: dependant.gender ? dependant.gender.charAt(0).toUpperCase() + dependant.gender.slice(1) : "—" },
              { icon: Droplet, label: "Blood Group", value: dependant.blood_group || "—" },
              { icon: Dna, label: "Genotype", value: dependant.genotype || "—" },
              { icon: AlertTriangle, label: "Allergies", value: dependant.allergies || "None" },
              { icon: Phone, label: "Phone", value: dependant.phone || "—" },
              { icon: Heart, label: "Relationship", value: dependant.relationship ? dependant.relationship.charAt(0).toUpperCase() + dependant.relationship.slice(1) : "—" },
              { icon: Users, label: "Family Account", value: `${dependant.family_code} (${dependant.patient_number})` },
              { icon: Calendar, label: "Member Since", value: new Date(dependant.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                <span className="flex items-center gap-2 text-xs text-white/45">
                  <Icon className="w-3.5 h-3.5 text-white/25" /> {label}
                </span>
                <span className="text-xs font-semibold text-white text-right">{value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {tab === "records" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">{ [0, 1].map((i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 animate-pulse">
                <div className="h-3 w-1/3 bg-white/[0.06] rounded mb-2" />
                <div className="h-3 w-2/3 bg-white/[0.06] rounded" />
              </div>
            ))}</div>
          ) : records.length === 0 ? (
            <GlassCard className="flex flex-col items-center py-8 text-center">
              <Stethoscope className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-sm text-white/50">No medical records yet</p>
              <p className="text-xs text-white/30 mt-1 max-w-[220px]">
                Records created by doctors and nurses will appear here.
              </p>
            </GlassCard>
          ) : (
            records.map((r) => (
              <GlassCard key={r.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e0a84a]/10 border border-[#e0a84a]/25 text-[10px] font-semibold text-[#e0a84a]">
                    <FileText className="w-3 h-3" /> {recordTypeLabels[r.record_type] || r.record_type}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mt-2">{r.title}</p>
                {r.description && <p className="text-xs text-white/50 mt-1">{r.description}</p>}
                {r.diagnosis && (
                  <p className="text-xs text-white/50 mt-1"><span className="text-white/70 font-medium">Diagnosis:</span> {r.diagnosis}</p>
                )}
                <p className="text-[10px] text-white/30 mt-2">
                  {r.staff?.user?.first_name ? `Dr. ${r.staff.user.first_name} ${r.staff.user.last_name?.charAt(0)}.` : "Hospital staff"}
                </p>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {tab === "bills" && (
        <div className="space-y-3">
          {outstanding > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-rose-500/[0.06] border border-rose-500/20 px-3 py-2.5">
              <span className="text-xs text-rose-400 font-medium">Total Outstanding</span>
              <span className="text-sm font-bold text-rose-400">₦{outstanding.toLocaleString()}</span>
            </div>
          )}
          {invoices.length === 0 && !loading ? (
            <GlassCard className="flex flex-col items-center py-8 text-center">
              <CreditCard className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-sm text-white/50">No bills yet</p>
              <p className="text-xs text-white/30 mt-1 max-w-[220px]">
                Bills for this dependant will appear here and roll up to your family account.
              </p>
            </GlassCard>
          ) : (
            invoices.map((inv) => {
              const due = inv.total_amount - (inv.paid_amount || 0);
              const unpaid = inv.status === "pending" || inv.status === "partially_paid";
              return (
                <GlassCard key={inv.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{inv.invoice_number}</p>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
                      inv.status === "paid"
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        : inv.status === "pending" || inv.status === "partially_paid"
                        ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                        : "bg-white/[0.06] border-white/10 text-white/50"
                    )}>
                      {inv.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">
                    {new Date(inv.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{inv.items?.length || 0} item(s)
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">₦{inv.total_amount.toLocaleString()}</p>
                      {unpaid && <p className="text-[10px] text-rose-400">₦{due.toLocaleString()} due</p>}
                    </div>
                    {unpaid && (
                      <button
                        onClick={() => setPayingInvoice(inv)}
                        className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-[#e0a84a]/15 hover:shadow-xl hover:shadow-[#e0a84a]/25 transition-all active:scale-[0.97]"
                      >
                        <Wallet className="w-3.5 h-3.5" /> Pay
                      </button>
                    )}
                  </div>
                  {(inv.paid_amount || 0) > 0 && (
                    <p className="text-[10px] text-emerald-400/80 mt-1.5">₦{inv.paid_amount.toLocaleString()} paid</p>
                  )}
                </GlassCard>
              );
            })
          )}
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-3">
          <Link
            href={`/patient/book?for=${dependantId}`}
            className="w-full h-11 rounded-xl border border-dashed border-[#e0a84a]/30 text-sm text-[#e0a84a] inline-flex items-center justify-center gap-2 bg-[#e0a84a]/[0.04] hover:border-[#e0a84a]/60 hover:bg-[#e0a84a]/[0.08] transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Book Appointment
          </Link>
          {appointments.length === 0 && !loading ? (
            <GlassCard className="flex flex-col items-center py-8 text-center">
              <Calendar className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-sm text-white/50">No appointments yet</p>
            </GlassCard>
          ) : (
            appointments.map((ap) => (
              <GlassCard key={ap.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {new Date(ap.appointment_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    <span className="text-white/40 font-normal"> at {ap.start_time?.slice(0, 5)}</span>
                  </p>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
                    appointmentStatusStyles[ap.status] || "bg-white/[0.06] border-white/10 text-white/50"
                  )}>
                    {ap.status === "completed"
                      ? <CheckCircle2 className="w-3 h-3" />
                      : ap.status === "cancelled" || ap.status === "no_show"
                      ? <X className="w-3 h-3" />
                      : <Clock className="w-3 h-3" />}
                    {ap.status.replace("_", " ")}
                  </span>
                </div>
                {ap.reason && <p className="text-xs text-white/50 mt-1.5">{ap.reason}</p>}
                <p className="text-[10px] text-white/30 mt-2">
                  {ap.staff?.user?.first_name ? `Dr. ${ap.staff.user.first_name} ${ap.staff.user.last_name?.charAt(0)}.` : "—"}
                </p>
              </GlassCard>
            ))
          )}
        </div>
      )}

      <EditDependantModal
        open={showEdit}
        dependant={dependant}
        onClose={() => setShowEdit(false)}
        onSaved={() => { load(); setShowEdit(false); }}
      />

      <DeleteDependantModal
        open={showDelete}
        dependant={dependant}
        onClose={() => setShowDelete(false)}
        onDeleted={() => { window.location.href = "/patient/dependants"; }}
      />

      <PayInvoiceModal
        invoice={payingInvoice}
        dependantId={dependantId}
        onClose={() => setPayingInvoice(null)}
        onPaid={() => { setPayingInvoice(null); load(); }}
      />
    </div>
  );
}

// ─── Edit modal ─────────────────────────────────────────────────

function EditDependantModal({ open, dependant, onClose, onSaved }: {
  open: boolean;
  dependant: Dependant | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", sex: "", blood_group: "", genotype: "",
    allergies: "", phone: "", relationship: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && dependant) {
      setForm({
        full_name: dependant.full_name,
        date_of_birth: dependant.date_of_birth || "",
        sex: dependant.gender || "",
        blood_group: dependant.blood_group || "",
        genotype: dependant.genotype || "",
        allergies: dependant.allergies || "",
        phone: dependant.phone || "",
        relationship: dependant.relationship || "",
      });
      setError("");
    }
  }, [open, dependant]);

  if (!open || !dependant) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.full_name.trim() || !form.date_of_birth || !form.sex) {
      setError("Full name, date of birth and sex are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dependants/${dependant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          date_of_birth: form.date_of_birth,
          sex: form.sex,
          blood_group: form.blood_group || undefined,
          genotype: form.genotype || undefined,
          allergies: form.allergies.trim() || undefined,
          phone: form.phone.trim() || undefined,
          relationship: form.relationship ? form.relationship.toLowerCase() : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) onSaved();
      else setError(json.error || "Failed to update dependant");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit Dependant" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Full Name *</label>
          <input className={inputCls} value={form.full_name} onChange={set("full_name")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Date of Birth *</label>
            <input type="date" className={inputCls} value={form.date_of_birth} onChange={set("date_of_birth")} />
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Sex *</label>
            <select className={selectCls} value={form.sex} onChange={set("sex")}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Blood Group</label>
            <select className={selectCls} value={form.blood_group} onChange={set("blood_group")}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Genotype</label>
            <select className={selectCls} value={form.genotype} onChange={set("genotype")}>
              <option value="">Select</option>
              {GENOTYPES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Relationship</label>
            <select className={selectCls} value={form.relationship} onChange={set("relationship")}>
              <option value="">Select</option>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block">Phone</label>
            <input className={inputCls} value={form.phone} onChange={set("phone")} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Allergies</label>
          <textarea className={textareaCls} rows={2} value={form.allergies} onChange={set("allergies")} placeholder="Leave blank if none" />
        </div>
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
        )}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full h-12 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Delete modal ───────────────────────────────────────────────

function DeleteDependantModal({ open, dependant, onClose, onDeleted }: {
  open: boolean;
  dependant: Dependant | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!open || !dependant) return null;

  const handleDelete = async () => {
    setError("");
    setDeleting(true);
    try {
      const res = await fetch(`/api/dependants/${dependant.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) onDeleted();
      else setError(json.error || "Failed to remove dependant");
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalShell title="Remove Dependant" onClose={onClose}>
      <p className="text-sm text-white/60">
        Remove <span className="text-white font-semibold">{dependant.full_name}</span> from your family account?
        Their medical records, appointments and bills will be permanently deleted.
      </p>
      {error && (
        <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
      )}
      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.04] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 h-11 rounded-xl bg-rose-500/90 text-white text-sm font-semibold hover:bg-rose-500 transition-all disabled:opacity-50"
        >
          {deleting ? "Removing..." : "Remove"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Pay invoice modal ──────────────────────────────────────────

function PayInvoiceModal({ invoice, dependantId, onClose, onPaid }: {
  invoice: Invoice | null;
  dependantId: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invoice) {
      const due = invoice.total_amount - (invoice.paid_amount || 0);
      setAmount(String(due));
      setMethod("cash");
      setError("");
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.id,
          patient_id: dependantId,
          amount: amt,
          payment_method: method,
          notes: `Payment for dependant by family account`,
        }),
      });
      const json = await res.json();
      if (json.success) onPaid();
      else setError(json.error || "Payment failed");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Pay ${invoice.invoice_number}`}
      subtitle="Bills roll up to your family account"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex items-center justify-between">
          <span className="text-xs text-white/50">Invoice total</span>
          <span className="text-sm font-bold text-white">₦{invoice.total_amount.toLocaleString()}</span>
        </div>
        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Amount (₦)</label>
          <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} min={1} />
        </div>
        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Payment Method</label>
          <select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </div>
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
        )}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full h-12 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {saving ? "Processing..." : "Confirm Payment"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Shared modal shell ─────────────────────────────────────────

function ModalShell({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#0d1322] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] transition-all">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
