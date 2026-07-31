"use client";

import { useEffect, useState } from "react";
import { Calendar, CreditCard, FileText, Zap, ArrowRight, Clock, CheckCircle, ChevronRight, IdCard, Phone, User as UserIcon, HeartPulse, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/logo";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useAppointmentStore } from "@/stores/appointment-store";
import { usePaymentStore } from "@/stores/payment-store";
import type { Patient, Dependant } from "@/lib/api-types";

function GlassCard({ children, href, className }: { children: React.ReactNode; href?: string; className?: string }) {
  const content = (
    <div className={cn(
      "relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 overflow-hidden transition-all duration-300 hover:border-white/[0.12] group",
      href && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e0a84a]/5",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.04] to-transparent" />
      {children}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ─── Identity Card ──────────────────────────────────────────────

interface OrgProfile {
  name: string;
  logo_url: string;
  address: string;
  email: string;
}

function IdentityCard({ patient, org }: { patient: Patient | null; org: OrgProfile }) {
  const { user } = useAuth();
  const fullName = user ? `${user.first_name} ${user.last_name}` : "Patient";
  const initials = user ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() : "PA";
  const gender = patient?.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase()
    : "—";
  const dob = patient?.date_of_birth
    ? new Date(patient.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const plan = patient?.medical_plan
    ? patient.medical_plan.charAt(0).toUpperCase() + patient.medical_plan.slice(1)
    : "Individual";

  const detailRow = (label: string, value: string) => (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">{label}</span>
      <span className="text-xs font-semibold text-white text-right truncate">{value}</span>
    </div>
  );

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4">
        <IdCard className="w-4 h-4 text-[#e0a84a]" />
        <h3 className="text-sm font-semibold text-white">Identity Card</h3>
      </div>

      <div className="m-3 mt-2 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0b2a4a] via-[#0e3a63] to-[#0d5f7a] border border-white/[0.08]">
        {/* Hospital header */}
        <div className="flex items-center gap-2.5 px-4 pt-4">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-md overflow-hidden">
            <img
              src={org.logo_url || "/images/hosp-logo/life-blossom-logo.png"}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">{org.name || "Life Blossom Hospital"}</p>
            {org.address && <p className="text-[10px] text-white/60 truncate">{org.address}</p>}
            {org.email && <p className="text-[10px] text-white/60 truncate">{org.email}</p>}
          </div>
        </div>

        {/* Patient */}
        <div className="flex gap-3 px-4 pt-4">
          <div className="w-16 h-16 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-[#e0a84a]/30">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Patient photo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-[#e0a84a]">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white leading-tight truncate">{fullName}</p>
            <p className="text-[11px] text-[#e0a84a] font-semibold mt-0.5">
              Patient No: {patient?.patient_number || "—"}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e0a84a]/15 border border-[#e0a84a]/25 text-[10px] font-semibold text-[#e0a84a] capitalize">
                <HeartPulse className="w-3 h-3" />{plan}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-medium text-white/70 capitalize">
                <UserIcon className="w-3 h-3" />{gender}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-4 pt-3 pb-1">
          <div className="rounded-xl bg-black/20 border border-white/[0.06] px-3 py-1.5">
            {detailRow("Phone", user?.phone || "—")}
            {detailRow("Date of Birth", dob)}
          </div>
        </div>

        {/* Footer tagline */}
        <div className="mt-3 px-4 py-2.5 bg-[#e0a84a]">
          <p className="text-[11px] font-semibold text-[#0a0f1a] text-center leading-snug">
            Your Health, Our Priority – Where Care Meets Cure.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dependants, setDependants] = useState<Dependant[]>([]);
  const [org, setOrg] = useState<OrgProfile>({
    name: "Life Blossom Hospital",
    logo_url: "/images/hosp-logo/life-blossom-logo.png",
    address: "",
    email: "",
  });

  useEffect(() => {
    fetch("/api/patients/me")
      .then((r) => r.json())
      .then((json) => { if (json.success) setPatient(json.data); })
      .catch(() => {});
    fetch("/api/dependants")
      .then((r) => r.json())
      .then((json) => { if (json.success) setDependants(json.data.dependants || []); })
      .catch(() => {});
    fetch("/api/org")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setOrg({
            name: json.data.name || "Life Blossom Hospital",
            logo_url: json.data.logo_url || "/images/hosp-logo/life-blossom-logo.png",
            address: json.data.address || "",
            email: json.data.email || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const appointments = useAppointmentStore((s) => s.appointments);
  const loadingAppts = useAppointmentStore((s) => s.loading);
  const fetchAppointments = useAppointmentStore((s) => s.fetchAppointments);

  const invoices = usePaymentStore((s) => s.invoices);
  const payments = usePaymentStore((s) => s.payments);
  const loadingPay = usePaymentStore((s) => s.loading);
  const fetchInvoices = usePaymentStore((s) => s.fetchInvoices);
  const fetchPayments = usePaymentStore((s) => s.fetchPayments);

  useEffect(() => {
    fetchAppointments({ pageSize: 50 });
    fetchInvoices({ pageSize: 50 });
    fetchPayments({ pageSize: 50 });
  }, [fetchAppointments, fetchInvoices, fetchPayments]);

  const loading = loadingAppts || loadingPay;

  const upcoming = appointments?.find(
    (a) => a.status === "scheduled" || a.status === "confirmed" || a.status === "in_progress"
  );
  const pendingInvoices = invoices?.filter((inv) => inv.status === "pending" || inv.status === "partially_paid");
  const outstandingTotal = pendingInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) ?? 0;
  const dependantOutstanding = dependants.reduce((sum, d) => sum + d.outstanding, 0);
  const familyOutstanding = outstandingTotal + dependantOutstanding;
  const needsAttentionCount = dependants.filter((d) => d.status === "needs_attention").length;
  const sortedPayments = payments?.slice().sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );
  const lastPayment = sortedPayments?.[0];

  const quickActions = [
    { label: "Book", href: "/patient/book", gradient: "from-[#e0a84a] to-amber-500" },
    { label: "Pay", href: "/patient/payments", gradient: "from-emerald-500 to-teal-400" },
    { label: "Chat", href: "https://wa.me/2349058038476", gradient: "from-blue-500 to-indigo-400" },
    { label: "Records", href: "/patient/records", gradient: "from-violet-500 to-purple-400" },
    { label: "Messages", href: "/patient/internal-mail", gradient: "from-rose-500 to-pink-400" },
    { label: "Bills", href: "/patient/invoices", gradient: "from-orange-500 to-amber-400" },
  ];

  const summaryCards = [
    {
      title: "Upcoming Appointment",
      value: loading ? "..." : upcoming
        ? `${new Date(upcoming.appointment_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${upcoming.start_time?.slice(0, 5)}`
        : "No upcoming",
      sub: loading ? "" : upcoming
        ? (upcoming.staff?.user?.first_name ? `Dr. ${upcoming.staff.user.first_name} ${upcoming.staff.user.last_name.charAt(0)}.` : upcoming.reason || "Appointment")
        : "Book a visit",
      icon: Calendar,
      gradient: "from-amber-500/20 via-amber-400/10 to-transparent",
      iconBg: "bg-amber-500/10 text-amber-400",
      href: "/patient/appointments",
    },
    {
      title: "Outstanding Balance",
      value: loading ? "..." : `₦${familyOutstanding.toLocaleString()}`,
      sub: loading ? "" : `${(pendingInvoices?.length ?? 0) + dependants.reduce((s, d) => s + d.pending_invoices, 0)} pending invoice(s)`,
      icon: CreditCard,
      gradient: "from-rose-500/20 via-rose-400/10 to-transparent",
      iconBg: "bg-rose-500/10 text-rose-400",
      href: "/patient/payments",
    },
    {
      title: "Dependants",
      value: loading ? "..." : `${dependants.length} dependant${dependants.length === 1 ? "" : "s"}`,
      sub: loading ? "" : needsAttentionCount > 0
        ? `${needsAttentionCount} need${needsAttentionCount === 1 ? "s" : ""} attention`
        : "Manage family members under your care",
      icon: Users,
      gradient: "from-cyan-500/20 via-cyan-400/10 to-transparent",
      iconBg: "bg-cyan-500/10 text-cyan-400",
      href: "/patient/dependants",
    },
    {
      title: "Last Payment",
      value: loading ? "..." : lastPayment ? `₦${lastPayment.amount.toLocaleString()}` : "None",
      sub: loading ? "" : lastPayment ? `Paid on ${new Date(lastPayment.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "",
      icon: FileText,
      gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
      iconBg: "bg-emerald-500/10 text-emerald-400",
      href: "/patient/payments",
    },
    {
      title: "Quick Actions",
      value: "What would you like?",
      sub: "Book, Pay, Chat, Records, Messages, Bills",
      icon: Zap,
      gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
      iconBg: "bg-blue-500/10 text-blue-400",
      href: "/patient",
    },
  ];

  const recentActivity: Array<{
    icon: React.ElementType;
    color: string;
    bg: string;
    title: string;
    desc: string;
    time: string;
  }> = [];

  if (appointments?.length) {
    const recentAppts = [...appointments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2)
      .map((a) => ({
        icon: a.status === "completed" ? (CheckCircle as React.ElementType) : (Clock as React.ElementType),
        color: a.status === "completed" ? "text-emerald-400" : "text-blue-400",
        bg: a.status === "completed" ? "bg-emerald-500/10" : "bg-blue-500/10",
        title: a.status === "completed" ? "Appointment Completed" : a.status === "cancelled" ? "Appointment Cancelled" : "Appointment Scheduled",
        desc: a.staff?.user?.first_name ? `Dr. ${a.staff.user.first_name} ${a.staff.user.last_name.charAt(0)}.` : a.reason || "Visit",
        time: new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      }));
    recentActivity.push(...recentAppts);
  }

  if (lastPayment) {
    recentActivity.push({
      icon: CreditCard as React.ElementType,
      color: "text-[#e0a84a]",
      bg: "bg-[#e0a84a]/10",
      title: "Payment Made",
      desc: `₦${lastPayment.amount.toLocaleString()} - ${lastPayment.invoice?.invoice_number || "Payment"}`,
      time: new Date(lastPayment.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <Logo variant="inline" iconSize={28} textClass="text-lg font-bold text-white" />
        <p className="text-white/50 text-sm">Welcome back{user ? `, ${user.first_name}` : ""}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((card) => (
          <GlassCard key={card.title} href={card.href}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", card.iconBg)}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">{card.title}</p>
            <p className="text-sm font-bold text-white">{card.value}</p>
            {card.sub && <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{card.sub}</p>}
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const isExternal = action.href.startsWith("http");
            return (
              <a
                key={action.label}
                href={action.href}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 h-10 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-[0.98] bg-gradient-to-r text-white shadow-lg",
                  action.gradient,
                )}
              >
                {action.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            );
          })}
        </div>
      </GlassCard>

      {dependants.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Family</h3>
            <Link href="/patient/dependants" className="text-xs text-[#e0a84a] hover:underline">
              Manage
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {dependants.map((d) => (
              <Link
                key={d.id}
                href={`/patient/dependants/${d.id}`}
                className={cn(
                  "shrink-0 flex items-center gap-2 pl-2 pr-3 h-10 rounded-xl border transition-all",
                  d.status === "needs_attention"
                    ? "border-amber-500/30 bg-amber-500/[0.06] hover:border-amber-500/50"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-[#e0a84a]/40"
                )}
              >
                <span className="w-6 h-6 rounded-full bg-[#e0a84a]/15 border border-[#e0a84a]/25 flex items-center justify-center text-[10px] font-bold text-[#e0a84a]">
                  {d.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-medium text-white/80 whitespace-nowrap">{d.full_name.split(" ")[0]}</span>
                {d.status === "needs_attention" && (
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                )}
              </Link>
            ))}
          </div>
        </GlassCard>
      )}

      <IdentityCard patient={patient} org={org} />

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </div>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                  <item.icon className={cn("w-4 h-4", item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80">{item.title}</p>
                  <p className="text-xs text-white/50">{item.desc}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/40">No recent activity yet.</p>
        )}
      </GlassCard>
    </div>
  );
}
