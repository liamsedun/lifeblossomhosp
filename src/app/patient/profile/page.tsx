"use client";

import { useState } from "react";
import { User, Mail, Phone, Calendar, Droplets, AlertTriangle, Bell, Moon, Lock, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePatients } from "@/hooks/use-patients";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: patients, loading: patientLoading } = usePatients();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const patient = patients?.find((p) => p.user_id === user?.id) ?? patients?.[0];

  const personalInfo: Array<{ label: string; value: string; icon: React.ElementType }> = [
    { label: "Full Name", value: user ? `${user.first_name} ${user.last_name}` : "...", icon: User },
    { label: "Email", value: user?.email || "...", icon: Mail },
    { label: "Phone", value: user?.phone || "Not provided", icon: Phone },
    { label: "Date of Birth", value: patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not provided", icon: Calendar },
    { label: "Blood Group", value: patient?.blood_group || "Not provided", icon: Droplets },
    { label: "Allergies", value: "Ask your doctor", icon: AlertTriangle },
  ];

  const fullName = user ? `${user.first_name} ${user.last_name}` : "Patient";
  const initials = user ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() : "PA";

  const toggleSwitch = (val: boolean, setter: (v: boolean) => void) => (
    <button
      onClick={() => setter(!val)}
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

  if (patientLoading) {
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
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-full bg-primary-lighter flex items-center justify-center text-primary font-bold text-2xl mb-3">
          {initials}
        </div>
        <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
        <p className="text-xs text-text-secondary">Patient ID: {patient?.patient_number || user?.id?.slice(0, 8)?.toUpperCase() || "---"}</p>
      </div>

      <div className="bg-card border border-border rounded-xl card-shadow divide-y divide-border">
        {personalInfo.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-text-secondary">{item.label}</p>
              <p className="text-sm text-foreground font-medium">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

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
          {toggleSwitch(darkMode, setDarkMode)}
        </div>
        <button className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-foreground font-medium">Change Password</span>
          </div>
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      <button className="flex items-center justify-center gap-2 w-full h-12 border border-danger/40 text-danger text-sm font-semibold rounded-xl hover:bg-danger-light transition-colors">
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
}
