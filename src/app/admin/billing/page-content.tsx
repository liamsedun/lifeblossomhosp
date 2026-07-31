"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, Plus, Eye, DollarSign, TrendingUp, Wallet, Receipt,
  Loader2, CheckCircle, AlertCircle, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { usePaymentStore, selectOverdueInvoices } from "@/stores/payment-store";
import CreateInvoiceModal from "@/components/billing/create-invoice-modal";
import type { InvoiceStatus, Invoice } from "@/lib/api-types";

type DisplayStatus = "Paid" | "Pending" | "Overdue" | "Partial";

interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  patient: string;
  patientId: string;
  service: string;
  amount: number;
  paidAmount: number;
  date: string;
  dueDate: string;
  status: DisplayStatus;
  raw: Invoice;
}

const statusStyles: Record<DisplayStatus, "success" | "secondary" | "destructive" | "warning"> = {
  Paid: "success",
  Pending: "secondary",
  Overdue: "destructive",
  Partial: "warning",
};

const statusIcon: Record<DisplayStatus, typeof CheckCircle> = {
  Paid: CheckCircle,
  Pending: FileText,
  Overdue: AlertCircle,
  Partial: AlertCircle,
};

function mapStatus(apiStatus: InvoiceStatus, dueDate: string | null): DisplayStatus {
  switch (apiStatus) {
    case "paid": return "Paid";
    case "partially_paid": return "Partial";
    case "pending":
      if (dueDate && new Date(dueDate) < new Date()) return "Overdue";
      return "Pending";
    default: return "Pending";
  }
}

function GradientCard({ children, gradient, className }: { children: React.ReactNode; gradient: string; className?: string }) {
  return (
    <div className={cn("relative group", className)}>
      <div className={cn("absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30", gradient)} />
      <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 overflow-hidden">
        <div className={cn("absolute top-0 right-0 w-48 h-48 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10", gradient)} />
        {children}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const invoicesData = usePaymentStore((s) => s.invoices);
  const loading = usePaymentStore((s) => s.loading);
  const totals = usePaymentStore((s) => s.totals);
  const fetchInvoices = usePaymentStore((s) => s.fetchInvoices);
  const overdueInvoices = usePaymentStore(selectOverdueInvoices);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const invoices = useMemo(() => {
    if (!invoicesData) return [];
    return invoicesData
      .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled" && inv.status !== "refunded")
      .map((inv) => {
        const patientName = inv.patient?.user
          ? `${inv.patient.user.first_name} ${inv.patient.user.last_name}`
          : inv.patient_id;
        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          patient: patientName,
          patientId: inv.patient_id,
          service: inv.items?.[0]?.description || inv.notes || "Medical Service",
          amount: inv.total_amount,
          paidAmount: inv.paid_amount,
          date: inv.created_at ? formatDate(inv.created_at) : "—",
          dueDate: inv.due_date ? formatDate(inv.due_date) : "—",
          status: mapStatus(inv.status, inv.due_date),
          raw: inv,
        };
      });
  }, [invoicesData]);

  const summaryCards = [
    { label: "Collected Revenue", value: loading ? "—" : formatCurrency(totals.totalRevenue), icon: TrendingUp, gradient: "bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-300" },
    { label: "Outstanding", value: loading ? "—" : formatCurrency(totals.outstandingAmount), icon: Wallet, gradient: "bg-gradient-to-br from-amber-500 via-orange-400 to-rose-300" },
    { label: "This Month", value: loading ? "—" : formatCurrency(totals.paidThisMonth), icon: DollarSign, gradient: "bg-gradient-to-br from-blue-500 via-indigo-400 to-violet-300" },
    { label: "Total Invoices", value: loading ? "—" : String(invoices?.length ?? 0), icon: Receipt, gradient: "bg-gradient-to-br from-purple-500 via-pink-400 to-rose-300" },
  ];

  const filtered = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.patient.toLowerCase().includes(search.toLowerCase()) ||
      inv.service.toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = overdueInvoices.reduce((s, i) => s + (i.total_amount - i.paid_amount), 0);

  return (
    <div className="space-y-5">
      {overdueInvoices.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-red-400 font-medium">
            {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""} — {formatCurrency(totalOutstanding)}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-sm text-white/50 mt-1">Manage invoices and payments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}
          className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20">
          <Plus className="size-4" />Create Invoice
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <GradientCard key={card.label} gradient={card.gradient}>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm text-white/50">{card.label}</p>
                  <p className="text-xl font-bold text-white mt-1">{card.value}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-sm">
                  <Icon className="size-5 text-white/80" />
                </div>
              </div>
            </GradientCard>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <Input placeholder="Search invoices..."
              className="h-9 pl-9 text-sm bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-white/40">
                  <th className="px-5 py-3.5 font-medium">Invoice #</th>
                  <th className="px-5 py-3.5 font-medium">Patient</th>
                  <th className="px-5 py-3.5 font-medium">Service</th>
                  <th className="px-5 py-3.5 font-medium">Amount</th>
                  <th className="px-5 py-3.5 font-medium">Outstanding</th>
                  <th className="px-5 py-3.5 font-medium">Date</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-white/40">No invoices found.</td></tr>
                ) : (
                  filtered.map((inv) => {
                    const outstanding = inv.raw.total_amount - inv.raw.paid_amount;
                    const StatusIcon = statusIcon[inv.status];
                    return (
                      <tr key={inv.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-white">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3.5 font-medium text-white/80">{inv.patient}</td>
                        <td className="px-5 py-3.5 text-white/50">{inv.service}</td>
                        <td className="px-5 py-3.5 font-medium text-white">{formatCurrency(inv.amount)}</td>
                        <td className="px-5 py-3.5">
                          {inv.status === "Paid" ? (
                            <span className="text-emerald-400 text-xs font-medium">Cleared</span>
                          ) : (
                            <span className={cn("text-xs font-semibold", outstanding > 0 ? "text-amber-400" : "text-white/50")}>
                              {outstanding > 0 ? formatCurrency(outstanding) : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-white/50">{inv.date}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusStyles[inv.status]} className="text-[11px] flex items-center gap-1 w-fit">
                            <StatusIcon className="size-3" />
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/admin/billing/${inv.id}`}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs text-[#e0a84a] font-medium hover:bg-[#e0a84a]/10 transition-colors"
                          >
                            <Eye className="size-3.5" />View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateInvoiceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => fetchInvoices()}
      />
    </div>
  );
}
