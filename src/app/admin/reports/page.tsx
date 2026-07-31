"use client";

import { useMemo, useCallback } from "react";
import {
  TrendingUp, Calendar, Users, Clock, Download, DollarSign, Activity, Printer,
} from "lucide-react";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency } from "@/lib/utils";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useAppointments } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { useInvoices } from "@/hooks/use-billing";
import { useStaff } from "@/hooks/use-staff";
import { Loader2 } from "lucide-react";
import type { Invoice, Appointment } from "@/lib/api-types";

const CHART_COLORS = ["#e0a84a", "#16A34A", "#0891B2", "#F39C12", "#E74C3C", "#8B5CF6", "#6366F1", "#EC4898"];

function escapeCsv(val: string | number): string {
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const bom = "\uFEFF";
  const csv = bom + rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { authorized } = useRoleGuard(["super_admin", "admin", "accountant"]);
  const { data: appointments, loading: aptLoading } = useAppointments();
  const { data: patients, loading: patLoading } = usePatients();
  const { data: invoices, loading: invLoading } = useInvoices();
  const { data: staff, loading: staffLoading } = useStaff();
  const loading = aptLoading || patLoading || invLoading || staffLoading;

  const kpis = useMemo(() => {
    const totalRevenue = (invoices || []).filter((i) => i.status === "paid" || i.status === "partially_paid")
      .reduce((sum, i) => sum + i.total_amount, 0);

    const prevMonthRev = (invoices || []).filter((i) => {
      const d = new Date(i.issue_date);
      const now = new Date();
      return d >= new Date(now.getFullYear(), now.getMonth() - 1, 1) && d < new Date(now.getFullYear(), now.getMonth(), 1);
    }).reduce((sum, i) => sum + (i.status === "paid" || i.status === "partially_paid" ? i.total_amount : 0), 0);

    const thisMonthRev = (invoices || []).filter((i) => {
      const d = new Date(i.issue_date);
      const now = new Date();
      return d >= new Date(now.getFullYear(), now.getMonth(), 1);
    }).reduce((sum, i) => sum + (i.status === "paid" || i.status === "partially_paid" ? i.total_amount : 0), 0);

    const monthApts = (appointments || []).filter((a) => {
      const d = new Date(a.appointment_date);
      const now = new Date();
      return d >= new Date(now.getFullYear(), now.getMonth(), 1);
    }).length;

    const newPatientsThisMonth = (patients || []).filter((p) => {
      const d = new Date(p.created_at);
      const now = new Date();
      return d >= new Date(now.getFullYear(), now.getMonth(), 1);
    }).length;

    const revTrend = prevMonthRev > 0 ? ((thisMonthRev - prevMonthRev) / prevMonthRev * 100).toFixed(1) : "0";

    return {
      totalRevenue: formatCurrency(totalRevenue),
      revenueTrend: `${thisMonthRev >= prevMonthRev ? "+" : ""}${revTrend}%`,
      revenueUp: thisMonthRev >= prevMonthRev,
      monthAppointments: monthApts,
      newPatients: newPatientsThisMonth,
    };
  }, [invoices, appointments, patients]);

  const revenueTrendData = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    const byMonth: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      byMonth[key] = 0;
    }
    (invoices || []).filter((i) => i.status === "paid" || i.status === "partially_paid").forEach((i) => {
      const d = new Date(i.issue_date);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (byMonth[key] !== undefined) byMonth[key] += i.total_amount;
    });
    return Object.entries(byMonth).map(([month, amount]) => ({ month, amount }));
  }, [invoices]);

  const deptPieData = useMemo(() => {
    if (!appointments) return [];
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      const dept = a.staff?.department || "General";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [appointments]);

  const recentActivity = useMemo(() => {
    const items: { action: string; detail: string; time: string; }[] = [];
    if (patients && patients.length > 0) {
      const last = patients[0];
      const name = last.user ? `${last.user.first_name} ${last.user.last_name}` : "New patient";
      items.push({ action: "New patient registered", detail: `${name} — ${last.patient_number}`, time: "Recently" });
    }
    if (appointments && appointments.length > 0) {
      const last = appointments[0];
      const name = last.patient?.user ? `${last.patient.user.first_name} ${last.patient.user.last_name}` : "Patient";
      items.push({ action: "Appointment completed", detail: `${name} with ${last.staff?.user?.first_name || "staff"}`, time: "Recently" });
    }
    if (invoices && invoices.length > 0) {
      const paid = invoices.find((i) => i.status === "paid");
      if (paid) {
        items.push({ action: "Payment received", detail: `${formatCurrency(paid.total_amount)} — ${paid.invoice_number}`, time: "Recently" });
      }
    }
    items.push({
      action: "System active", detail: `${staff?.length || 0} staff, ${patients?.length || 0} patients, ${appointments?.length || 0} appointments`,
      time: "Live",
    });
    return items;
  }, [patients, appointments, invoices, staff]);

  const exportCsv = useCallback(() => {
    const rows: string[][] = [
      ["Life Blossom Hospital — Performance Report"],
      ["Generated", new Date().toLocaleString()],
      [""],
      ["Metric", "Value"],
      ["Total Revenue", kpis.totalRevenue],
      ["Revenue Trend", kpis.revenueTrend],
      ["Monthly Appointments", String(kpis.monthAppointments)],
      ["New Patients (Month)", String(kpis.newPatients)],
      ["Total Staff", String(staff?.length || 0)],
      ["Total Patients", String(patients?.length || 0)],
      ["Total Appointments", String(appointments?.length || 0)],
      [""],
      ["Month", "Revenue"],
      ...revenueTrendData.map((d) => [d.month, String(d.amount)]),
      [""],
      ["Department", "Appointments"],
      ...deptPieData.map((d) => [d.name, String(d.value)]),
      [""],
      ["Recent Activity", "Detail", "Time"],
      ...recentActivity.map((a) => [a.action, a.detail, a.time]),
    ];
    downloadCsv(`hospital-report-${new Date().toISOString().split("T")[0]}.csv`, rows);
  }, [kpis, revenueTrendData, deptPieData, recentActivity, staff, patients, appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-8 animate-spin text-[#e0a84a]" />
      </div>
    );
  }

  if (!authorized) return null;
  return (
    <div className="space-y-5 print:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-white/50 mt-1">Hospital performance analytics and insights</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
              <Download className="size-4" />Export Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white/80">
            <DropdownMenuItem onClick={exportCsv}
              className="hover:bg-white/[0.06] hover:text-white">
              <Download className="size-3.5 mr-2" />Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}
              className="hover:bg-white/[0.06] hover:text-white">
              <Printer className="size-3.5 mr-2" />Print Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        {[
          { label: "Total Revenue", value: kpis.totalRevenue, trend: kpis.revenueTrend, up: kpis.revenueUp, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Appointments (Month)", value: String(kpis.monthAppointments), trend: `${appointments?.length || 0} total`, up: true, icon: Calendar, color: "text-[#e0a84a]", bg: "bg-[#e0a84a]/10" },
          { label: "New Patients (Month)", value: String(kpis.newPatients), trend: `${patients?.length || 0} total`, up: true, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Staff", value: String(staff?.length || 0), trend: `${appointments?.length || 0} total appointments`, up: true, icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl print:border-gray-300 print:bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-white/50 print:text-gray-600">{kpi.label}</p>
                    <p className="text-2xl font-bold text-white mt-1 print:text-gray-900">{kpi.value}</p>
                    <p className={cn("mt-1 text-xs font-medium", kpi.up ? "text-emerald-400 print:text-emerald-600" : "text-rose-400")}>{kpi.trend}</p>
                  </div>
                  <div className={cn("flex size-10 items-center justify-center rounded-lg print:hidden", kpi.bg)}>
                    <Icon className={cn("size-5", kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl print:border-gray-300 print:bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white print:text-gray-900">Revenue Trend (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 print:h-64">
              {revenueTrendData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-white/30">No invoice data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1e6).toFixed(1)}M`} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#0d1322" }}
                      formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} labelStyle={{ color: "rgba(255,255,255,0.7)" }} />
                    <Line type="monotone" dataKey="amount" stroke="#e0a84a" strokeWidth={2} dot={{ fill: "#e0a84a", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl print:border-gray-300 print:bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white print:text-gray-900">Appointments by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 print:h-64">
              {deptPieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-white/30">No appointment data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {deptPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#0d1322" }}
                      formatter={(v) => [v, ""]} labelStyle={{ color: "rgba(255,255,255,0.7)" }} />
                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                      formatter={(value: string) => <span className="text-xs text-white/50">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl print:border-gray-300 print:bg-white">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base text-white print:text-gray-900">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/[0.06] print:divide-gray-200">
            {recentActivity.map((act, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white print:text-gray-900">{act.action}</p>
                  <p className="text-xs text-white/50 mt-0.5 print:text-gray-600">{act.detail}</p>
                </div>
                <span className="text-xs text-white/30 shrink-0 print:text-gray-500">{act.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
