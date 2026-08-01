"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, UserPlus, X, AlertTriangle, ShieldCheck,
  Calendar, Droplet, Dna, ChevronRight, Baby, Heart, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import type { Dependant } from "@/lib/api-types";

const MAX_DEPENDANTS = 5;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENOTYPES = ["AA", "AS", "SS", "AC", "SC", "CC"];
const RELATIONSHIPS = ["Child", "Spouse", "Parent", "Sibling", "Grandparent", "Other"];

const relationshipIcons: Record<string, React.ElementType> = {
  Child: Baby, Spouse: Heart, Parent: Heart, Sibling: Users, Grandparent: Users, Other: Users,
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

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-white/50 mb-1.5 block">{label}</label>
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

function AddDependantModal({ open, onClose, onCreated, maxReached }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  maxReached: boolean;
}) {
  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", sex: "",
    blood_group: "", genotype: "", allergies: "", phone: "", relationship: "",
  });
  const [avatar, setAvatar] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ full_name: "", date_of_birth: "", sex: "", blood_group: "", genotype: "", allergies: "", phone: "", relationship: "" });
      setAvatar("");
      setError("");
    }
  }, [open]);

  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setError("Unsupported image type — use JPG, PNG, WebP or GIF");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be 2 MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  if (!open) return null;

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
      const res = await fetch("/api/dependants", {
        method: "POST",
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
          avatar: avatar || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated();
        onClose();
      } else {
        setError(json.error || "Failed to add dependant");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#0d1322] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-lg font-bold text-white">Add Dependant</h3>
            <p className="text-xs text-white/40">Family member under your care</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] transition-all">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        <div className={cn(
          "mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 border text-xs",
          maxReached
            ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-400"
            : "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400"
        )}>
          {maxReached ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
          <span>{maxReached ? "You've reached the maximum of 5 dependants." : `Up to ${MAX_DEPENDANTS} dependants per family account.`}</span>
        </div>

        <div className="space-y-4 mt-4">
          <Field label="Photo (optional)">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative w-16 h-16 rounded-2xl border border-dashed border-white/[0.15] bg-white/[0.03] overflow-hidden flex items-center justify-center group hover:border-[#e0a84a]/50 transition-all"
              >
                {avatar ? (
                  <img src={avatar} alt="Dependant photo preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-white/40 group-hover:text-[#e0a84a] transition-colors" />
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/50 text-[9px] text-white/80 py-0.5 text-center font-medium">
                  {avatar ? "Change" : "Add"}
                </span>
              </button>
              <div className="text-xs text-white/40 space-y-0.5">
                <p>Tap to choose a photo</p>
                <p className="text-white/25">JPG, PNG, WebP or GIF · max 2 MB</p>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onAvatarPick}
              />
            </div>
          </Field>

          <Field label="Full Name *">
            <input className={inputCls} value={form.full_name} onChange={set("full_name")} placeholder="e.g. Adaeze Edun" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth *">
              <input type="date" className={inputCls} value={form.date_of_birth} onChange={set("date_of_birth")} />
            </Field>
            <Field label="Sex *">
              <select className={selectCls} value={form.sex} onChange={set("sex")}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Blood Group">
              <select className={selectCls} value={form.blood_group} onChange={set("blood_group")}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </Field>
            <Field label="Genotype">
              <select className={selectCls} value={form.genotype} onChange={set("genotype")}>
                <option value="">Select</option>
                {GENOTYPES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Relationship">
              <select className={selectCls} value={form.relationship} onChange={set("relationship")}>
                <option value="">Select</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Phone (optional)">
              <input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="e.g. 0803 000 0000" />
            </Field>
          </div>

          <Field label="Allergies">
            <textarea
              className={textareaCls}
              rows={2}
              value={form.allergies}
              onChange={set("allergies")}
              placeholder="e.g. Penicillin, peanuts (leave blank if none)"
            />
          </Field>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-12 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {saving ? "Adding..." : "Add Dependant"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DependantsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isDependant = user?.role === "patient" && Boolean(user.patient?.is_dependant);
  const [dependants, setDependants] = useState<Dependant[]>([]);
  const [familyCode, setFamilyCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    fetch("/api/dependants")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setDependants(json.data.dependants || []);
          setFamilyCode(json.data.family?.family_code || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const maxReached = dependants.length >= MAX_DEPENDANTS;

  const age = (dob: string | null) => {
    if (!dob) return null;
    const d = new Date(dob);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/patient" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-white/50 hover:text-white transition-colors" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">Dependants</h2>
          <p className="text-xs text-white/40">Manage family members under your care</p>
        </div>
        {!isDependant && (
          <button
            onClick={() => setShowAdd(true)}
            disabled={maxReached}
            className={cn(
              "inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
              maxReached
                ? "bg-white/[0.04] text-white/30 cursor-not-allowed"
                : "bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30"
            )}
          >
            <UserPlus className="w-4 h-4" />
            Add Dependant
          </button>
        )}
      </div>

      <GlassCard className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Family Account {familyCode && <span className="text-[#e0a84a]">{familyCode}</span>}</p>
            <p className="text-xs text-white/40">
              {dependants.length} of {MAX_DEPENDANTS} slots used
            </p>
          </div>
        </div>
        <div className="w-20 h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e0a84a] to-amber-500 transition-all duration-500"
            style={{ width: `${(dependants.length / MAX_DEPENDANTS) * 100}%` }}
          />
        </div>
      </GlassCard>

      {maxReached && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 px-3 py-2.5 text-xs text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          You've reached the maximum of 5 dependants per family account.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] mb-3" />
              <div className="h-3 w-3/4 bg-white/[0.06] rounded mb-2" />
              <div className="h-3 w-1/2 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      ) : dependants.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-cyan-400" />
          </div>
          <h3 className="text-base font-semibold text-white">No dependants yet</h3>
          <p className="text-xs text-white/40 max-w-[240px] mt-1">
            {isDependant
              ? "Your main account holder manages dependants for your family."
              : "Add family members — children, spouse or relatives — so they're covered under your family account."}
          </p>
          {!isDependant && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 h-10 px-5 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30 transition-all active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" /> Add Dependant
            </button>
          )}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {dependants.map((d) => {
            const RelIcon = relationshipIcons[d.relationship || "Other"] || Users;
            const a = age(d.date_of_birth);
            return (
              <Link
                key={d.id}
                href={`/patient/dependants/${d.id}`}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e0a84a]/5"
              >
                <div className="absolute top-0 right-0 w-24 h-24 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.05] to-transparent" />

                <div className="flex items-start justify-between gap-2">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0b2a4a] to-[#0d5f7a] border border-white/10 overflow-hidden flex items-center justify-center text-sm font-bold text-[#e0a84a] shrink-0">
                    {d.avatar_url ? (
                      <img src={d.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      d.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border",
                    d.status === "needs_attention"
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  )}>
                    {d.status === "needs_attention" ? <AlertTriangle className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                    {d.status === "needs_attention" ? "Needs Attention" : "Active"}
                  </span>
                </div>

                <p className="text-sm font-bold text-white mt-3 truncate">{d.full_name}</p>
                <p className="text-[11px] text-[#e0a84a] font-semibold mt-0.5 truncate">
                  {familyCode} · {d.patient_number}
                </p>

                <div className="mt-2.5 space-y-1">
                  <p className="text-[11px] text-white/50">
                    {a !== null ? `${a} yrs` : "—"} · <span className="capitalize">{d.gender || "—"}</span>
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-white/50">
                    <Droplet className="w-3 h-3 text-rose-400/70" /> {d.blood_group || "—"}
                    <span className="mx-1 text-white/20">·</span>
                    <Dna className="w-3 h-3 text-cyan-400/70" /> {d.genotype || "—"}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2.5">
                  <span className="inline-flex items-center gap-1 text-[10px] text-white/40 capitalize">
                    <RelIcon className="w-3 h-3" /> {d.relationship || "Family"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {d.outstanding > 0 && (
                      <span className="text-[10px] font-semibold text-rose-400">₦{d.outstanding.toLocaleString()}</span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-white/25 group-hover:text-[#e0a84a] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!isDependant && !maxReached && dependants.length > 0 && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full h-12 rounded-2xl border border-dashed border-white/[0.12] text-sm text-white/50 hover:text-[#e0a84a] hover:border-[#e0a84a]/40 transition-all inline-flex items-center justify-center gap-2 bg-white/[0.02]"
        >
          <UserPlus className="w-4 h-4" /> Add Dependant
        </button>
      )}

      <AddDependantModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} maxReached={maxReached} />

      <p className="text-[11px] text-white/30 text-center">
        <Calendar className="inline w-3 h-3 mr-1" />
        Dependants share your family account — medical records, bills and appointments sync across all hospital systems.
      </p>
    </div>
  );
}
