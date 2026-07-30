"use client";

import { useEffect, useState, useRef } from "react";
import {
  User, Mail, Phone, Calendar, Droplets, AlertTriangle,
  Bell, Moon, Lock, LogOut, ChevronRight, Camera, Check, X, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { Patient } from "@/lib/api-types";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Edit profile state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Password change state
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

  // Dark mode persistence
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
    { label: "Full Name", value: fullName, icon: User },
    { label: "Email", value: user?.email || "...", icon: Mail, field: "email" },
    { label: "Phone", value: user?.phone || "Not provided", icon: Phone, field: "phone" },
    { label: "Date of Birth", value: patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not provided", icon: Calendar },
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
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editingField]: editValue.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update");
      setSuccessMsg(`${editingField === "email" ? "Email" : "Phone"} updated successfully`);
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
        val ? "bg-primary" : "bg-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
          val && "translate-x-5"
        )}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center py-4">
          <div className="w-20 h-20 rounded-full bg-muted animate-pulse mb-3" />
          <div className="h-5 bg-muted rounded w-1/3 animate-pulse mb-1" />
          <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
        </div>
        <div className="bg-card border border-border rounded-xl card-shadow divide-y divide-border">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ===== Avatar ===== */}
      <div className="flex flex-col items-center py-4">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-primary-lighter flex items-center justify-center text-primary font-bold text-2xl mb-3 overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-2 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-dark transition-colors"
            title="Change photo"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
        <p className="text-xs text-text-secondary">
          Patient ID: {patient?.patient_number || user?.id?.slice(0, 8)?.toUpperCase() || "---"}
        </p>
      </div>

      {/* Success / Error messages */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-accent-light px-4 py-2.5 text-sm text-accent">
          <Check className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-danger-light px-4 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      {/* ===== Personal Info ===== */}
      <div className="bg-card border border-border rounded-xl card-shadow divide-y divide-border">
        {personalInfo.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-text-secondary">{item.label}</p>
              {editingField === item.field ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type={item.field === "email" ? "email" : "tel"}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 h-8 text-sm bg-background border border-border rounded-md px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                  <button onClick={saveEdit} disabled={saving} className="p-1 text-accent hover:text-accent-dark shrink-0">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={cancelEdit} className="p-1 text-text-secondary hover:text-foreground shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-foreground font-medium truncate">
                    {item.value}
                  </p>
                  {item.field && (
                    <button
                      onClick={() => startEdit(item.field!, item.value === "Not provided" ? "" : item.value === "..." ? "" : item.value)}
                      className="p-0.5 text-text-secondary hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {item.field && !editingField && (
              <button
                onClick={() => startEdit(item.field!, item.value === "Not provided" ? "" : item.value === "..." ? "" : item.value)}
                className="p-1.5 text-text-secondary hover:text-primary hover:bg-muted rounded-md transition-colors shrink-0"
                title={`Edit ${item.label}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ===== Settings ===== */}
      <div className="bg-card border border-border rounded-xl card-shadow divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-foreground font-medium">Notifications</span>
          </div>
          {toggleSwitch(notifications, setNotifications)}
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Moon className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-foreground font-medium">Dark Mode</span>
          </div>
          {toggleSwitch(darkMode, toggleDarkMode)}
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-foreground font-medium">Change Password</span>
          </div>
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* ===== Logout ===== */}
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="flex items-center justify-center gap-2 w-full h-12 border border-danger/40 text-danger text-sm font-semibold rounded-xl hover:bg-danger-light transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>

      {/* ===== Change Password Modal ===== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Change Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setPwError(""); setPwSuccess(""); }} className="p-1 text-text-secondary hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">New Password</label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              {pwError && (
                <div className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-accent-light px-3 py-2 text-sm text-accent">
                  <Check className="w-4 h-4" />
                  {pwSuccess}
                </div>
              )}
              <button
                type="submit"
                disabled={pwSaving}
                className="w-full h-11 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {pwSaving ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== Logout Confirmation ===== */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xs p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6 text-danger" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Logout</h3>
            <p className="text-sm text-text-secondary mb-5">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 rounded-lg bg-danger text-white text-sm font-semibold hover:bg-danger/90 transition-colors"
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
