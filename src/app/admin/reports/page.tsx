"use client";

import {
  TrendingUp,
  Calendar,
  Users,
  Clock,
  Download,
  MoreHorizontal,
  DollarSign,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

const revenueTrend = [
  { month: "Aug", amount: 3800000 },
  { month: "Sep", amount: 4200000 },
  { month: "Oct", amount: 3950000 },
  { month: "Nov", amount: 4500000 },
  { month: "Dec", amount: 5100000 },
  { month: "Jan", amount: 4800000 },
  { month: "Feb", amount: 5300000 },
  { month: "Mar", amount: 4950000 },
  { month: "Apr", amount: 5200000 },
  { month: "May", amount: 5600000 },
  { month: "Jun", amount: 5400000 },
  { month: "Jul", amount: 5800000 },
];

const deptPieData = [
  { name: "Cardiology", value: 280, color: "#0F4C81" },
  { name: "General", value: 320, color: "#16A34A" },
  { name: "Pediatrics", value: 190, color: "#0891B2" },
  { name: "Orthopedics", value: 140, color: "#F39C12" },
  { name: "Neurology", value: 110, color: "#E74C3C" },
  { name: "Maternity", value: 160, color: "#8B5CF6" },
];

const recentActivity = [
  { action: "New patient registered", detail: "Amara Okafor — LB-042", time: "2 min ago", type: "patient" },
  { action: "Appointment completed", detail: "Chidi Eze with Dr. Okonkwo", time: "15 min ago", type: "apt" },
  { action: "Payment received", detail: "₦85,000 — INV-001", time: "1 hr ago", type: "payment" },
  { action: "Invoice overdue", detail: "INV-003 — ₦45,000", time: "2 hrs ago", type: "alert" },
  { action: "Staff shift change", detail: "Nurse Esther — On Leave", time: "3 hrs ago", type: "staff" },
  { action: "Lab results uploaded", detail: "Emeka Nwosu — X-Ray", time: "5 hrs ago", type: "lab" },
];

const kpis = [
  { label: "Total Revenue", value: "₦58.4M", trend: "+12.3%", up: true, icon: DollarSign, color: "text-accent", bg: "bg-accent-light" },
  { label: "Appointments (Month)", value: "1,204", trend: "+8.1%", up: true, icon: Calendar, color: "text-primary", bg: "bg-primary-lighter" },
  { label: "New Patients", value: "186", trend: "+15.2%", up: true, icon: Users, color: "text-secondary", bg: "bg-secondary-light" },
  { label: "Avg Wait Time", value: "14 min", trend: "-3 min", up: true, icon: Clock, color: "text-warning", bg: "bg-warning-light" },
];

const typeIcons: Record<string, React.ElementType> = {
  patient: Users,
  apt: Calendar,
  payment: DollarSign,
  alert: Activity,
  staff: Users,
  lab: Activity,
};

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-text-secondary mt-1">
            Hospital performance analytics and insights
          </p>
        </div>
        <Button>
          <Download className="size-4" />
          Export Report
        </Button>
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
                    <p
                      className={cn(
                        "mt-1 text-xs font-medium",
                        kpi.up ? "text-accent" : "text-danger"
                      )}
                    >
                      {kpi.trend}
                    </p>
                  </div>
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", kpi.bg)}>
                    <Icon className={cn("size-5", kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7A90" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7A90" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5EAF0" }}
                    formatter={(v) => [formatCurrency(Number(v)), "Revenue"]}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#0F4C81" strokeWidth={2} dot={{ fill: "#0F4C81", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Appointments by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {deptPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5EAF0" }}
                    formatter={(v) => [v, ""]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-text-secondary">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-primary">
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentActivity.map((act, i) => {
              const Icon = typeIcons[act.type] || Activity;
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4 text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {act.action}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {act.detail}
                    </p>
                  </div>
                  <span className="text-xs text-text-secondary shrink-0">
                    {act.time}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
