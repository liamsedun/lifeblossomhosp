"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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

interface OtherIncomeRecord {
  id: string;
  description: string;
  category: string;
  amount: number;
  income_date: string;
}

interface ExpenseRecord {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
}

interface OrgInfo {
  name: string;
  logo_url: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
}

const EXPENSE_LINES = [
  "Medical Expenses",
  "Other Medical Expenses",
  "Staff Salary",
  "Electricity (PHCN)",
  "Motor Vehicle Maintenance (Fuel & Repairs)",
  "Generator (Fuel & Repairs)",
  "Stationeries & Printing",
  "Janitorial/Cleaning",
  "Internet",
  "Telephone",
  "Rents & Rates",
  "Bank Charges",
  "Travelling/Transportation",
  "Newspapers/Medical Journals",
  "Other Misc. Expenses",
];

function expenseLineFor(e: ExpenseRecord): string {
  const desc = (e.description || "").toLowerCase();
  const cat = e.category || "";
  if (/(generator|diesel|petrol)/.test(desc)) return "Generator (Fuel & Repairs)";
  if (/(internet|wifi|data)/.test(desc)) return "Internet";
  if (/(telephone|airtime)/.test(desc)) return "Telephone";
  if (/(stationer|printing|printer|paper|ink)/.test(desc)) return "Stationeries & Printing";
  if (/(janitor|cleaning|cleaner|sanitiz|sanitise|housekeeping)/.test(desc)) return "Janitorial/Cleaning";
  if (/(bank charge|banking|pos fee|pos charge|card fee|transaction fee)/.test(desc)) return "Bank Charges";
  if (/(newspaper|journal|magazine)/.test(desc)) return "Newspapers/Medical Journals";
  if (/(vehicle|car repair|fuel for car|motor repair)/.test(desc)) return "Motor Vehicle Maintenance (Fuel & Repairs)";
  if (/(travel|transport|fare|travelling)/.test(desc)) return "Travelling/Transportation";
  switch (cat) {
    case "medical_supplies": return "Medical Expenses";
    case "equipment": return "Other Medical Expenses";
    case "salaries": return "Staff Salary";
    case "utilities": return "Electricity (PHCN)";
    case "rent": return "Rents & Rates";
    case "maintenance": return "Motor Vehicle Maintenance (Fuel & Repairs)";
    case "transport": return "Travelling/Transportation";
    default: return "Other Misc. Expenses";
  }
}

function fmtPeriodDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

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
  const [otherIncomeData, setOtherIncomeData] = useState<OtherIncomeRecord[]>([]);
  const [loadingOtherIncome, setLoadingOtherIncome] = useState(true);
  const [expensesData, setExpensesData] = useState<ExpenseRecord[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [pnlFrom, setPnlFrom] = useState("");
  const [pnlTo, setPnlTo] = useState("");
  const loading = aptLoading || patLoading || invLoading || staffLoading || loadingOtherIncome;

  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }, [month]);

  useEffect(() => {
    fetch("/api/other-income?page_size=500")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOtherIncomeData(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadingOtherIncome(false));
  }, []);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((json) => { if (json.success) setOrgInfo(json.data); })
      .catch(() => {});
  }, []);

  // P&L period defaults to the selected month (resets when the month picker changes)
  useEffect(() => {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    setPnlFrom(`${y}-${String(m).padStart(2, "0")}-01`);
    setPnlTo(`${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
  }, [month]);

  useEffect(() => {
    if (!pnlFrom || !pnlTo) return;
    setLoadingExpenses(true);
    fetch(`/api/expenses?from=${pnlFrom}&to=${pnlTo}&page_size=500`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setExpensesData(json.data || []); })
      .catch(() => setExpensesData([]))
      .finally(() => setLoadingExpenses(false));
  }, [pnlFrom, pnlTo]);

  const kpis = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const prevStart = new Date(y, m - 2, 1);
    const inMonth = (d: Date) => d >= start && d < end;
    const inPrev = (d: Date) => d >= prevStart && d < start;

    const medRev = (invoices || [])
      .filter((i) => (i.status === "paid" || i.status === "partially_paid") && inMonth(new Date(i.issue_date)))
      .reduce((sum, i) => sum + i.total_amount, 0);
    const othRev = otherIncomeData
      .filter((r) => inMonth(new Date(r.income_date)))
      .reduce((sum, r) => sum + r.amount, 0);
    const totalRevenue = medRev + othRev;

    const prevMonthRev = (invoices || [])
      .filter((i) => (i.status === "paid" || i.status === "partially_paid") && inPrev(new Date(i.issue_date)))
      .reduce((sum, i) => sum + i.total_amount, 0)
      + otherIncomeData
        .filter((r) => inPrev(new Date(r.income_date)))
        .reduce((sum, r) => sum + r.amount, 0);

    const monthApts = (appointments || []).filter((a) => inMonth(new Date(a.appointment_date))).length;

    const newPatientsThisMonth = (patients || []).filter((p) => inMonth(new Date(p.created_at))).length;

    const revTrend = prevMonthRev > 0 ? ((totalRevenue - prevMonthRev) / prevMonthRev * 100).toFixed(1) : "0";

    return {
      totalRevenue: formatCurrency(totalRevenue),
      revenueTrend: `${totalRevenue >= prevMonthRev ? "+" : ""}${revTrend}%`,
      revenueUp: totalRevenue >= prevMonthRev,
      monthAppointments: monthApts,
      newPatients: newPatientsThisMonth,
    };
  }, [invoices, appointments, patients, otherIncomeData, month]);

  const revenueTrendData = useMemo(() => {
    const now = new Date();
    const byMonth: Record<string, number> = {};
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
    otherIncomeData.forEach((r) => {
      const d = new Date(r.income_date);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (byMonth[key] !== undefined) byMonth[key] += r.amount;
    });
    return Object.entries(byMonth).map(([month, amount]) => ({ month, amount }));
  }, [invoices, otherIncomeData]);

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

  const pnl = useMemo(() => {
    if (!pnlFrom || !pnlTo) return null;
    const start = new Date(`${pnlFrom}T00:00:00`);
    const end = new Date(`${pnlTo}T23:59:59`);
    const inPeriod = (d: string) => {
      const dt = new Date(d);
      return dt >= start && dt <= end;
    };

    const medRev = (invoices || [])
      .filter((i) => (i.status === "paid" || i.status === "partially_paid") && inPeriod(i.issue_date))
      .reduce((sum, i) => sum + i.total_amount, 0);
    const othRev = otherIncomeData
      .filter((r) => inPeriod(r.income_date))
      .reduce((sum, r) => sum + r.amount, 0);

    const totals: Record<string, number> = {};
    EXPENSE_LINES.forEach((l) => { totals[l] = 0; });
    expensesData.forEach((e) => {
      const line = expenseLineFor(e);
      totals[line] = (totals[line] || 0) + Number(e.amount || 0);
    });

    const totalExpenses = Object.values(totals).reduce((s, v) => s + v, 0);
    const totalIncome = medRev + othRev;
    return {
      medRev,
      othRev,
      totalIncome,
      lines: EXPENSE_LINES.map((label) => ({ label, amount: totals[label] || 0 })),
      totalExpenses,
      net: totalIncome - totalExpenses,
    };
  }, [invoices, otherIncomeData, expensesData, pnlFrom, pnlTo]);

  const exportCsv = useCallback(() => {
    const rows: string[][] = [
      ["Life Blossom Hospital — Performance Report"],
      ["Generated", new Date().toLocaleString()],
      ["Period", monthLabel],
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
      ...(pnl ? [
        [""],
        ["PROFIT AND LOSS STATEMENT"],
        ["Period", `From ${fmtPeriodDate(pnlFrom)} to ${fmtPeriodDate(pnlTo)}`],
        ["Revenue from Medical Services", String(pnl.medRev)],
        ["Other Incomes", String(pnl.othRev)],
        ["Total Income", String(pnl.totalIncome)],
        [""],
        ["Less: Expenses"],
        ...pnl.lines.map((l) => [l.label, String(l.amount)]),
        ["Total Expenses", String(pnl.totalExpenses)],
        ["NET PROFIT/(LOSS) FOR THE PERIOD", String(pnl.net)],
      ] : []),
      [""],
      ["Recent Activity", "Detail", "Time"],
      ...recentActivity.map((a) => [a.action, a.detail, a.time]),
    ];
    downloadCsv(`hospital-report-${new Date().toISOString().split("T")[0]}.csv`, rows);
  }, [kpis, revenueTrendData, deptPieData, recentActivity, staff, patients, appointments, monthLabel, pnl, pnlFrom, pnlTo]);

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-[#e0a84a]/40"
              aria-label="Reporting period"
            />
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

      {/* Profit & Loss Statement */}
      <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl print:border-gray-300 print:bg-white">
        <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-3 print:hidden">
          <CardTitle className="text-base text-white">Profit &amp; Loss Statement</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={pnlFrom} onChange={(e) => e.target.value && setPnlFrom(e.target.value)}
              className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white [color-scheme:dark] focus:outline-none focus:border-[#e0a84a]/40"
              aria-label="P&L from date" />
            <span className="text-xs text-white/40">to</span>
            <input type="date" value={pnlTo} onChange={(e) => e.target.value && setPnlTo(e.target.value)}
              className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white [color-scheme:dark] focus:outline-none focus:border-[#e0a84a]/40"
              aria-label="P&L to date" />
            <Button size="sm" className="h-9 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20"
              onClick={() => window.print()}>
              <Printer className="size-4" />Print P&L
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 print:p-0">
          {loadingExpenses ? (
            <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-[#e0a84a]" /></div>
          ) : pnl ? (
            <div className="print:text-black">
              {/* Hospital header */}
              <div className="flex items-center gap-4 mb-5 print:mb-4">
                {orgInfo?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={orgInfo.logo_url} alt={orgInfo.name || "Hospital logo"}
                    className="h-14 w-14 object-contain rounded-lg print:h-12 print:w-12" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-[#e0a84a]/15 border border-[#e0a84a]/20 flex items-center justify-center text-[#e0a84a] font-bold text-lg print:bg-gray-100 print:border-gray-300 print:text-gray-700">
                    {(orgInfo?.name || "L")[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-base font-bold text-white uppercase leading-tight print:text-gray-900">
                    {orgInfo?.name || "Life Blossom Hospital"}
                  </p>
                  {orgInfo?.address && (
                    <p className="text-xs text-white/50 mt-0.5 print:text-gray-600">{orgInfo.address}</p>
                  )}
                  <p className="text-[11px] text-white/40 mt-0.5 print:text-gray-500">
                    {[orgInfo?.phone && `Tel: ${orgInfo.phone}`, orgInfo?.email && `Email: ${orgInfo.email}`, orgInfo?.website && orgInfo.website]
                      .filter(Boolean).join(" • ")}
                  </p>
                </div>
              </div>

              {/* Statement title */}
              <div className="text-center mb-5">
                <p className="text-lg font-bold text-white print:text-gray-900">PROFIT AND LOSS STATEMENT</p>
                <p className="text-xs text-white/50 mt-1 print:text-gray-600">
                  For the period from {fmtPeriodDate(pnlFrom)} to {fmtPeriodDate(pnlTo)}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] print:border-gray-300 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-white/[0.05] print:divide-gray-200">
                    <tr>
                      <td className="px-4 py-2.5 text-white/80 print:text-gray-800">Revenue from Medical Services</td>
                      <td className="px-4 py-2.5 text-right text-white print:text-gray-900 font-medium">{formatCurrency(pnl.medRev)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-white/80 print:text-gray-800">Other Incomes</td>
                      <td className="px-4 py-2.5 text-right text-white print:text-gray-900 font-medium">{formatCurrency(pnl.othRev)}</td>
                    </tr>
                    <tr className="bg-white/[0.04] print:bg-gray-50">
                      <td className="px-4 py-2.5 font-bold text-white print:text-gray-900">Total Income</td>
                      <td className="px-4 py-2.5 text-right font-bold text-white print:text-gray-900 border-t-2 border-white/20 print:border-gray-400">{formatCurrency(pnl.totalIncome)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-white/60 italic print:text-gray-700" colSpan={2}>Less: Expenses</td>
                    </tr>
                    {pnl.lines.map((l) => (
                      <tr key={l.label}>
                        <td className="px-4 py-2 pl-8 text-white/80 print:text-gray-800">{l.label}</td>
                        <td className="px-4 py-2 text-right text-white print:text-gray-900">{formatCurrency(l.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-white/[0.04] print:bg-gray-50">
                      <td className="px-4 py-2.5 font-bold text-white print:text-gray-900">Total Expenses</td>
                      <td className="px-4 py-2.5 text-right font-bold text-white print:text-gray-900 border-t-2 border-white/20 print:border-gray-400">{formatCurrency(pnl.totalExpenses)}</td>
                    </tr>
                    <tr className="print:bg-gray-100">
                      <td className="px-4 py-3 font-extrabold text-[#e0a84a] print:text-gray-900">NET PROFIT/(LOSS) FOR THE PERIOD</td>
                      <td className={cn("px-4 py-3 text-right font-extrabold border-t-2 border-b-2 border-[#e0a84a]/40 print:border-gray-400",
                        pnl.net >= 0 ? "text-emerald-400 print:text-gray-900" : "text-rose-400 print:text-gray-900")}>
                        {formatCurrency(pnl.net)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-white/40">Select a period to view the P&amp;L statement.</div>
          )}
        </CardContent>
      </Card>

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
