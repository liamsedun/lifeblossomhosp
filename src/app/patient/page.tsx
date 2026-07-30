"use client";

import { useEffect } from "react";
import { Calendar, CreditCard, FileText, Zap, ArrowRight, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/logo";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useAppointmentStore } from "@/stores/appointment-store";
import { usePaymentStore } from "@/stores/payment-store";

export default function PatientDashboard() {
  const { user } = useAuth();

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
  const sortedPayments = payments?.slice().sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );
  const lastPayment = sortedPayments?.[0];

  const quickActions = [
    { label: "Book", href: "/patient/book", variant: "primary" as const },
    { label: "Pay", href: "/patient/payments", variant: "accent" as const },
    { label: "Chat", href: "https://wa.me/2349058038476", variant: "outline" as const },
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
      color: "text-primary",
      bg: "bg-primary-lighter",
      href: "/patient/appointments",
    },
    {
      title: "Outstanding Balance",
      value: loading ? "..." : `₦${outstandingTotal.toLocaleString()}`,
      sub: loading ? "" : `${pendingInvoices?.length ?? 0} pending invoice(s)`,
      icon: CreditCard,
      color: "text-warning",
      bg: "bg-warning-light",
      href: "/patient/payments",
    },
    {
      title: "Last Payment",
      value: loading ? "..." : lastPayment ? `₦${lastPayment.amount.toLocaleString()}` : "None",
      sub: loading ? "" : lastPayment ? `Paid on ${new Date(lastPayment.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "",
      icon: FileText,
      color: "text-accent",
      bg: "bg-accent-light",
      href: "/patient/payments",
    },
    {
      title: "Quick Actions",
      value: "What would you like?",
      sub: "Book, Pay or Chat",
      icon: Zap,
      color: "text-secondary",
      bg: "bg-secondary-light",
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
        color: a.status === "completed" ? "text-accent" : "text-secondary",
        bg: a.status === "completed" ? "bg-accent-light" : "bg-secondary-light",
        title: a.status === "completed" ? "Appointment Completed" : a.status === "cancelled" ? "Appointment Cancelled" : "Appointment Scheduled",
        desc: a.staff?.user?.first_name ? `Dr. ${a.staff.user.first_name} ${a.staff.user.last_name.charAt(0)}.` : a.reason || "Visit",
        time: new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      }));
    recentActivity.push(...recentAppts);
  }

  if (lastPayment) {
    recentActivity.push({
      icon: CreditCard as React.ElementType,
      color: "text-primary",
      bg: "bg-primary-lighter",
      title: "Payment Made",
      desc: `₦${lastPayment.amount.toLocaleString()} - ${lastPayment.invoice?.invoice_number || "Payment"}`,
      time: new Date(lastPayment.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-text-secondary text-sm">Welcome back{user ? `, ${user.first_name}` : ""}</p>
        <Logo variant="inline" iconSize={28} textClass="text-xl font-bold" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((card) => (
          <Link
            key={card.title}
            href={card.href || "#"}
            className="bg-card border border-border rounded-xl p-4 card-shadow hover:card-shadow-hover transition-all hover:-translate-y-0.5"
          >
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", card.bg)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
            <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-1">{card.title}</p>
            <p className="text-sm font-bold text-foreground">{card.value}</p>
            {card.sub && <p className="text-xs text-text-secondary mt-0.5">{card.sub}</p>}
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 card-shadow">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const isExternal = action.href.startsWith("http");
            return (
              <a
                key={action.label}
                href={action.href}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-medium transition-all hover:opacity-90",
                  action.variant === "primary" && "bg-primary text-white",
                  action.variant === "accent" && "bg-accent text-white",
                  action.variant === "outline" && "border border-border text-foreground hover:bg-muted"
                )}
              >
                {action.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 card-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        </div>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", item.bg)}>
                  <item.icon className={cn("w-4 h-4", item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-text-secondary">{item.desc}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">No recent activity yet.</p>
        )}
      </div>
    </div>
  );
}
