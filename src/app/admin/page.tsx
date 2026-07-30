"use client";

import { useMemo } from "react";
import {
  DollarSign, Users, Calendar, AlertTriangle,
  TrendingUp, TrendingDown, Plus, Stethoscope, FileText, ArrowUpRight, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAppointments } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { useStaff } from "@/hooks/use-staff";
import { useInvoices } from "@/hooks/use-billing";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Trend({ up, value }: { up: boolean; value: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-emerald-400" : "text-red-400")}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {value}
    </span>
  );
}

function GradientCard({ children, gradient, className }: { children: React.ReactNode; gradient: string; className?: string }) {
  return (
    <div className={cn("relative group", className)}>
      <div className={cn("absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30", gradient)} />
      <div className={cn("relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 overflow-hidden", className)}>
        <div className={cn("absolute top-0 right-0 w-48 h-48 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10", gradient)} />
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: appointmentsData, loading: loadingAppts } = useAppointments();
  const { data: patientsData, loading: loadingPatients } = usePatients();
  const { data: staffData, loading: loadingStaff } = useStaff();
  const { data: invoicesData, loading: loadingInvoices } = useInvoices();

  const loading = loadingAppts || loadingPatients || loadingStaff || loadingInvoices;

  const { totalRevenue, appointmentsToday, outstandingPayments, patientCount, staffCount } = useMemo(() => {
    const totalRev = (invoicesData || [])
      .filter((i) => i.status === "paid" || i.status === "partially_paid")
      .reduce((sum, i) => sum + i.total_amount, 0);
    const today = new Date().toISOString().split("T")[0];
    const todayApts = (appointmentsData || []).filter((a) => a.appointment_date?.startsWith(today)).length;
    const outstanding = (invoicesData || [])
      .filter((i) => i.status === "pending" || i.status === "partially_paid")
      .reduce((sum, i) => sum + i.total_amount, 0);
    return {
      totalRevenue: totalRev,
      appointmentsToday: todayApts,
      outstandingPayments: outstanding,
      patientCount: patientsData?.length ?? 0,
      staffCount: staffData?.length ?? 0,
    };
  }, [invoicesData, appointmentsData, patientsData, staffData]);

  const monthlyRevenue = useMemo(() => {
    const paid = (invoicesData || []).filter((i) => i.status === "paid" || i.status === "partially_paid");
    const now = new Date();
    const months: { month: string; amount: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      months.push({ month: label, amount: 0 });
    }
    paid.forEach((inv) => {
      const d = new Date(inv.issue_date);
      const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()) + 11;
      if (idx >= 0 && idx < 12) months[idx].amount += inv.total_amount;
    });
    return months;
  }, [invoicesData]);

  const weeklyRevenue = useMemo(() => {
    const paid = (invoicesData || []).filter((i) => i.status === "paid" || i.status === "partially_paid");
    const buckets: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    paid.filter((i) => new Date(i.issue_date) >= weekAgo).forEach((inv) => {
      const day = new Date(inv.issue_date).getDay();
      buckets[day] += inv.total_amount;
    });
    return DAYS.map((day, i) => ({ day, amount: buckets[i] }));
  }, [invoicesData]);

  const deptData = useMemo(() => {
    if (!appointmentsData) return [];
    const counts: Record<string, number> = {};
    appointmentsData.forEach((a: any) => {
      const dept = (a.doctor || a.staff)?.department || "General";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dept, count]) => ({ dept, count }));
  }, [appointmentsData]);

  const monthlyTotal = monthlyRevenue.reduce((s, m) => s + m.amount, 0);
  const prevMonthTotal = monthlyRevenue.length >= 2 ? monthlyRevenue[monthlyRevenue.length - 2].amount : 0;
  const revenueTrendPct = prevMonthTotal > 0 ? ((monthlyTotal - prevMonthTotal) / prevMonthTotal * 100).toFixed(1) : "0";
  const revenueUp = monthlyTotal >= prevMonthTotal;

  const recentPatients = useMemo(() => {
    if (!patientsData) return [];
    return patientsData.slice(0, 5).map((p) => ({
      name: p.user ? `${p.user.first_name} ${p.user.last_name}` : p.id,
      id: p.patient_number,
      lastVisit: p.created_at ? formatDate(p.created_at) : "N/A",
    }));
  }, [patientsData]);

  const kpis = [
    {
      label: "Total Revenue", value: loading ? "—" : formatCurrency(totalRevenue),
      trend: `${revenueUp ? "+" : ""}${revenueTrendPct}%`, up: revenueUp,
      icon: DollarSign, gradient: "bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-300",
    },
    {
      label: "Patients Today", value: loading ? "—" : String(patientCount),
      trend: `${staffCount} staff on board`, up: true,
      icon: Users, gradient: "bg-gradient-to-br from-blue-500 via-indigo-400 to-violet-300",
    },
    {
      label: "Appointments Today", value: loading ? "—" : String(appointmentsToday),
      trend: `${(appointmentsData?.length || 0) - appointmentsToday} other scheduled`, up: appointmentsToday > 0,
      icon: Calendar, gradient: "bg-gradient-to-br from-amber-500 via-orange-400 to-rose-300",
    },
    {
      label: "Outstanding Payments", value: loading ? "—" : formatCurrency(outstandingPayments),
      trend: `${(invoicesData || []).filter((i) => i.status === "pending").length} unpaid invoices`, up: false,
      icon: AlertTriangle, gradient: "bg-gradient-to-br from-red-500 via-rose-400 to-pink-300",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/50 mt-1">Welcome back. Here&apos;s your hospital overview.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-[#e0a84a]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/50 mt-1">Welcome back. Here&apos;s your hospital overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <GradientCard key={kpi.label} gradient={kpi.gradient}>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm text-white/50">{kpi.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
                  <div className="mt-1.5"><Trend up={kpi.up} value={kpi.trend} /></div>
                </div>
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-sm">
                  <Icon className="size-5 text-white/80" />
                </div>
              </div>
            </GradientCard>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {weeklyRevenue.every((d) => d.amount === 0) ? (
                <div className="flex items-center justify-center h-full text-sm text-white/30">No revenue data this week</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(13, 19, 34, 0.95)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
                      labelStyle={{ color: "rgba(255,255,255,0.5)" }} formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                    <Line type="monotone" dataKey="amount" stroke="#e0a84a" strokeWidth={2} dot={{ fill: "#e0a84a", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#e0a84a" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Appointments by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {deptData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-white/30">No appointment data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(13, 19, 34, 0.95)", backdropFilter: "blur(12px)" }}
                      labelStyle={{ color: "rgba(255,255,255,0.5)" }} />
                    <Bar dataKey="count" fill="#e0a84a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base text-white">Recent Patients</CardTitle>
            <Button variant="ghost" size="sm" className="text-[#e0a84a] hover:text-[#e0a84a]/80 hover:bg-white/[0.06] text-xs"
              onClick={() => router.push("/admin/patients")}>View All</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-white/40">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">ID</th>
                    <th className="px-5 py-3 font-medium">Registered</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-white/40">No patients yet.</td></tr>
                  ) : (
                    recentPatients.map((p) => (
                      <tr key={p.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 font-medium text-white/80">{p.name}</td>
                        <td className="px-5 py-3.5 text-white/50">{p.id}</td>
                        <td className="px-5 py-3.5 text-white/50">{p.lastVisit}</td>
                        <td className="px-5 py-3.5">
                          <Badge className="text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-[#e0a84a] hover:text-[#e0a84a]/80 hover:bg-white/[0.06]"
                            onClick={() => router.push("/admin/patients")}>View</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
          <CardHeader><CardTitle className="text-base text-white">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-3 h-11 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/80 hover:text-white transition-all"
              onClick={() => router.push("/admin/patients")}>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"><Plus className="size-4" /></div>
              Add Patient
            </Button>
            <Button className="w-full justify-start gap-3 h-11 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/80 hover:text-white transition-all"
              onClick={() => router.push("/admin/appointments")}>
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400"><Calendar className="size-4" /></div>
              Schedule Appointment
            </Button>
            <Button className="w-full justify-start gap-3 h-11 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/80 hover:text-white transition-all"
              onClick={() => router.push("/admin/reports")}>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400"><FileText className="size-4" /></div>
              Generate Report
            </Button>
            <Button className="w-full justify-start gap-3 h-11 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white/80 hover:text-white transition-all"
              onClick={() => router.push("/admin/reports")}>
              <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400"><ArrowUpRight className="size-4" /></div>
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
