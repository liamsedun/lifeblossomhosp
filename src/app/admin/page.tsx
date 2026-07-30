"use client";

import { useMemo } from "react";
import {
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Stethoscope,
  FileText,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAppointments } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { useStaff } from "@/hooks/use-staff";
import { useInvoices } from "@/hooks/use-billing";

const revenueData = [
  { day: "Mon", amount: 520000 },
  { day: "Tue", amount: 610000 },
  { day: "Wed", amount: 480000 },
  { day: "Thu", amount: 720000 },
  { day: "Fri", amount: 590000 },
  { day: "Sat", amount: 680000 },
  { day: "Sun", amount: 450000 },
];

const deptData = [
  { dept: "Cardiology", count: 12 },
  { dept: "Pediatrics", count: 8 },
  { dept: "Orthopedics", count: 6 },
  { dept: "Neurology", count: 5 },
  { dept: "General", count: 14 },
];

function Trend({ up, value }: { up: boolean; value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-accent" : "text-danger"
      )}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {value}
    </span>
  );
}

export default function AdminDashboard() {
  const { data: appointmentsData, loading: loadingAppts } = useAppointments();
  const { data: patientsData, loading: loadingPatients } = usePatients();
  const { data: staffData, loading: loadingStaff } = useStaff();
  const { data: invoicesData, loading: loadingInvoices } = useInvoices();

  const loading = loadingAppts || loadingPatients || loadingStaff || loadingInvoices;

  const totalRevenue = useMemo(() => {
    if (!invoicesData) return 0;
    return invoicesData
      .filter((i) => i.status === "paid" || i.status === "partially_paid")
      .reduce((sum, i) => sum + i.total_amount, 0);
  }, [invoicesData]);

  const appointmentsToday = useMemo(() => {
    if (!appointmentsData) return 0;
    const today = new Date().toISOString().split("T")[0];
    return appointmentsData.filter((a) => a.appointment_date?.startsWith(today)).length;
  }, [appointmentsData]);

  const outstandingPayments = useMemo(() => {
    if (!invoicesData) return 0;
    return invoicesData
      .filter((i) => i.status === "pending" || i.status === "partially_paid")
      .reduce((sum, i) => sum + i.total_amount, 0);
  }, [invoicesData]);

  const patientCount = patientsData?.length ?? 0;

  const kpis = [
    {
      label: "Total Revenue",
      value: loading ? "—" : formatCurrency(totalRevenue),
      trend: "+12%",
      up: true,
      icon: DollarSign,
      color: "text-accent",
      bg: "bg-accent-light",
    },
    {
      label: "Patients Today",
      value: loading ? "—" : String(patientCount),
      trend: "+8%",
      up: true,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary-lighter",
    },
    {
      label: "Appointments Today",
      value: loading ? "—" : String(appointmentsToday),
      trend: "+8%",
      up: true,
      icon: Calendar,
      color: "text-secondary",
      bg: "bg-secondary-light",
    },
    {
      label: "Outstanding Payments",
      value: loading ? "—" : formatCurrency(outstandingPayments),
      trend: "+5%",
      up: false,
      icon: AlertTriangle,
      color: "text-danger",
      bg: "bg-danger-light",
    },
  ];

  const recentPatients = useMemo(() => {
    if (!patientsData) return [];
    return patientsData.slice(0, 5).map((p) => ({
      name: p.user ? `${p.user.first_name} ${p.user.last_name}` : p.id,
      id: p.patient_number,
      lastVisit: p.created_at ? formatDate(p.created_at) : "N/A",
      status: "Active" as const,
    }));
  }, [patientsData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Welcome back. Here&apos;s your hospital overview.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Welcome back, Dr. Adams. Here&apos;s your hospital overview.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {kpi.value}
                    </p>
                    <div className="mt-1.5">
                      <Trend up={kpi.up} value={kpi.trend} />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      kpi.bg
                    )}
                  >
                    <Icon className={cn("size-5", kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6B7A90" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E5EAF0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    }}
                    formatter={(v) => [formatCurrency(Number(v)), "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#0F4C81"
                    strokeWidth={2}
                    dot={{ fill: "#0F4C81", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Appointments by dept */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Appointments by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E5EAF0",
                    }}
                  />
                  <Bar dataKey="count" fill="#0F4C81" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent patients + Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent patients table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Patients</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs">
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">ID</th>
                    <th className="px-5 py-3 font-medium">Last Visit</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-text-secondary">
                        No patients yet.
                      </td>
                    </tr>
                  ) : (
                    recentPatients.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          {p.name}
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary">{p.id}</td>
                        <td className="px-5 py-3.5 text-text-secondary">{p.lastVisit}</td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant={p.status === "Active" ? "success" : "secondary"}
                            className="text-[11px]"
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-3 h-11" variant="outline">
              <div className="flex size-7 items-center justify-center rounded-md bg-accent-light text-accent">
                <Plus className="size-4" />
              </div>
              Add Patient
            </Button>
            <Button className="w-full justify-start gap-3 h-11" variant="outline">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary-lighter text-primary">
                <Calendar className="size-4" />
              </div>
              Schedule Appointment
            </Button>
            <Button className="w-full justify-start gap-3 h-11" variant="outline">
              <div className="flex size-7 items-center justify-center rounded-md bg-warning-light text-warning">
                <FileText className="size-4" />
              </div>
              Generate Report
            </Button>
            <Button className="w-full justify-start gap-3 h-11" variant="outline">
              <div className="flex size-7 items-center justify-center rounded-md bg-danger-light text-danger">
                <ArrowUpRight className="size-4" />
              </div>
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
