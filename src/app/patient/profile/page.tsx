"use client";

import { useEffect, useState, useRef } from "react";
import {
  User, Mail, Phone, Calendar, Droplets, AlertTriangle,
  Bell, Moon, Lock, LogOut, ChevronRight, Camera, Check, X, Pencil, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { Patient } from "@/lib/api-types";

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.04] to-transparent" />
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/patients/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPatient(json.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("patient_dark_mode") === "true";
    setDarkMode(saved);
    if (saved) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  const toggleDarkMode = (val: boolean) => {
    setDarkMode(val);
    localStorage.setItem("patient_dark_mode", String(val));
    if (val) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const fullName = user ? `${user.first_name} ${user.last_name}` : "Patient";
  const initials = user ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() : "PA";

  const personalInfo: Array<{ label: string; value: string; icon: React.ElementType; field?: string }> = [
    { label: "Full Name", value: fullName, icon: User, field: "full_name" },
    { label: "Email", value: user?.email || "...", icon: Mail, field: "email" },
    { label: "Phone", value: user?.phone || "Not provided", icon: Phone, field: "phone" },
    { label: "Date of Birth", value: patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not provided", icon: Calendar, field: "date_of_birth" },
    { label: "Medical Plan", value: patient?.medical_plan ? patient.medical_plan.charAt(0).toUpperCase() + patient.medical_plan.slice(1) : "Individual", icon: CreditCard, field: "medical_plan" },
    { label: "Blood Group", value: patient?.blood_group || "Not provided", icon: Droplets },
    { label: "Allergies", value: "Ask your doctor", icon: AlertTriangle },
  ];

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setError("");
    setSuccessMsg("");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
    setError("");
  };

  const saveEdit = async () => {
    if (!editingField || !editValue.trim()) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      let body: Record<string, any>;
      let endpoint: string;
      let label: string;

      if (editingField === "date_of_birth") {
        endpoint = `/api/patients/${patient!.id}`;
        body = { date_of_birth: editValue };
        label = "Date of Birth";
      } else if (editingField === "medical_plan") {
        endpoint = `/api/patients/${patient!.id}`;
        body = { medical_plan: editValue };
        label = "Medical Plan";
      } else if (editingField === "full_name") {
        endpoint = "/api/auth/profile";
        const parts = editValue.trim().split(" ");
        body = { first_name: parts[0] || "", last_name: parts.slice(1).join(" ") || parts[0] || "" };
        label = "Name";
      } else {
        endpoint = "/api/auth/profile";
        body = { [editingField]: editValue.trim() };
        label = editingField === "email" ? "Email" : "Phone";
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update");
      setSuccessMsg(`${label} updated successfully`);
      setEditingField(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      setSuccessMsg("Photo updated!");
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwNew !== pwConfirm) {
      setPwError("Passwords do not match");
      return;
    }
    if (pwNew.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: pwCurrent, new_password: pwNew }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to change password");
      setPwSuccess("Password changed successfully");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const toggleSwitch = (val: boolean, onChange: (v: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!val)}
      className={cn(
        "w-11 h-6 rounded-full relative transition-colors",
        val ? "bg-gradient-to-r from-[#e0a84a] to-amber-500" : "bg-white/[0.08]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
          val && "translate-x-5"
        )}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center py-4">
          <div className="w-20 h-20 rounded-full bg-white/[0.06] animate-pulse mb-3" />
          <div className="h-5 bg-white/[0.06] rounded w-1/3 animate-pulse mb-1" />
          <div className="h-3 bg-white/[0.06] rounded w-1/4 animate-pulse" />
        </div>
        <GlassCard>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-white/[0.06] rounded w-1/4 animate-pulse" />
                <div className="h-4 bg-white/[0.06] rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div className="relative group">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#e0a84a]/40 via-[#e0a84a]/20 to-transparent blur-md group-hover:blur-lg transition-all" />
          <div className="relative w-20 h-20 rounded-full bg-[#1a2540] flex items-center justify-center text-[#e0a84a] font-bold text-2xl mb-3 overflow-hidden ring-2 ring-[#e0a84a]/30 group-hover:ring-[#e0a84a]/50 transition-all">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-2 right-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#e0a84a] to-amber-500 text-[#0a0f1a] flex items-center justify-center shadow-lg hover:shadow-xl hover:shadow-[#e0a84a]/20 transition-all hover:scale-110"
            title="Change photo"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <h2 className="text-lg font-bold text-white">{fullName}</h2>
        <p className="text-xs text-white/50">
          Patient ID: {patient?.patient_number || user?.id?.slice(0, 8)?.toUpperCase() || "---"}
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm text-emerald-400">
          <Check className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Personal Info */}
      <GlassCard>
        <div className="divide-y divide-white/[0.04]">
          {personalInfo.map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3.5 group">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-white/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/40">{item.label}</p>
                {editingField === item.field ? (
                  editingField === "medical_plan" ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 h-8 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 text-white focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/30 [color-scheme:dark]"
                        autoFocus
                      >
                        <option value="individual">Individual</option>
                        <option value="family">Family</option>
                        <option value="organisation">Organisation</option>
                        <option value="hmo">HMO</option>
                      </select>
                      <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-400 hover:text-emerald-300 shrink-0">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="p-1 text-white/40 hover:text-white/70 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type={item.field === "date_of_birth" ? "date" : item.field === "email" ? "email" : "tel"}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 h-8 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 text-white focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/30 [color-scheme:dark]"
                      autoFocus
                    />
                    <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-400 hover:text-emerald-300 shrink-0">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} className="p-1 text-white/40 hover:text-white/70 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  )
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-white/80 font-medium truncate">
                      {item.value}
                    </p>
                  </div>
                )}
              </div>
              {item.field && !editingField && (
                <button
                  onClick={() => {
                    let initial = "";
                    if (item.field === "date_of_birth") {
                      initial = patient?.date_of_birth ? patient.date_of_birth.slice(0, 10) : "";
                    } else if (item.field === "medical_plan") {
                      initial = patient?.medical_plan || "individual";
                    } else {
                      initial = item.value === "Not provided" || item.value === "..." ? "" : item.value;
                    }
                    startEdit(item.field!, initial);
                  }}
                  className="p-1.5 text-white/30 hover:text-[#e0a84a] hover:bg-white/[0.04] rounded-lg transition-all shrink-0 opacity-0 group-hover:opacity-100"
                  title={`Edit ${item.label}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Settings */}
      <GlassCard>
        <div className="divide-y divide-white/[0.04]">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-white/50" />
              <span className="text-sm text-white/80 font-medium">Notifications</span>
            </div>
            {toggleSwitch(notifications, setNotifications)}
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-white/50" />
              <span className="text-sm text-white/80 font-medium">Dark Mode</span>
            </div>
            {toggleSwitch(darkMode, toggleDarkMode)}
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center justify-between w-full px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-white/50" />
              <span className="text-sm text-white/80 font-medium">Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </GlassCard>

      {/* Logout */}
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="flex items-center justify-center gap-2 w-full h-12 border border-rose-500/20 text-rose-400 text-sm font-semibold rounded-xl hover:bg-rose-500/10 transition-all group"
      >
        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        Logout
      </button>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0d1322]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-base font-semibold text-white">Change Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setPwError(""); setPwSuccess(""); }} className="p-1 text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/30 focus:border-[#e0a84a]/40"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">New Password</label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/30 focus:border-[#e0a84a]/40"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 block mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/30 focus:border-[#e0a84a]/40"
                  required
                />
              </div>
              {pwError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-400">
                  <Check className="w-4 h-4" />
                  {pwSuccess}
                </div>
              )}
              <button
                type="submit"
                disabled={pwSaving}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold hover:shadow-lg hover:shadow-[#e0a84a]/20 transition-all disabled:opacity-50"
              >
                {pwSaving ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0d1322]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-rose-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Logout</h3>
            <p className="text-sm text-white/50 mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm font-medium text-white/70 hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-rose-500/20 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
