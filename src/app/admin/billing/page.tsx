"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, Plus, Eye, DollarSign, TrendingUp, Wallet, Receipt, Loader2, CheckCircle, AlertCircle, ExternalLink
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

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDisplay | null>(null);

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
    { label: "Collected Revenue", value: loading ? "—" : formatCurrency(totals.totalRevenue), icon: TrendingUp, color: "text-accent", bg: "bg-accent-light" },
    { label: "Outstanding", value: loading ? "—" : formatCurrency(totals.outstandingAmount), icon: Wallet, color: "text-warning", bg: "bg-warning-light" },
    { label: "This Month", value: loading ? "—" : formatCurrency(totals.paidThisMonth), icon: DollarSign, color: "text-primary", bg: "bg-primary-lighter" },
    { label: "Total Invoices", value: loading ? "—" : String(invoices?.length ?? 0), icon: Receipt, color: "text-secondary", bg: "bg-secondary-light" },
  ];

  const filtered = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.patient.toLowerCase().includes(search.toLowerCase()) ||
      inv.service.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {overdueInvoices.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-danger/5 border border-danger/20 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
          <span className="text-danger font-medium">
            {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""} — {formatCurrency(overdueInvoices.reduce((s, i) => s + (i.total_amount - i.paid_amount), 0))}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-text-secondary mt-1">Manage invoices and payments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="size-4" />Create Invoice</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">{card.label}</p>
                    <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
                  </div>
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", card.bg)}>
                    <Icon className={cn("size-5", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
            <Input placeholder="Search invoices..." className="h-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary">
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
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-text-secondary">No invoices found.</td></tr>
                  ) : (
                    filtered.map((inv) => {
                      const outstanding = inv.raw.total_amount - inv.raw.paid_amount;
                      return (
                        <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs font-medium text-foreground">{inv.invoiceNumber}</td>
                          <td className="px-5 py-3.5 font-medium text-foreground">{inv.patient}</td>
                          <td className="px-5 py-3.5 text-text-secondary">{inv.service}</td>
                          <td className="px-5 py-3.5 font-medium text-foreground">{formatCurrency(inv.amount)}</td>
                          <td className="px-5 py-3.5">
                            {inv.status === "Paid" ? (
                              <span className="text-accent text-xs font-medium">Cleared</span>
                            ) : (
                              <span className={cn("text-xs font-semibold", outstanding > 0 ? "text-warning" : "text-text-secondary")}>
                                {outstanding > 0 ? formatCurrency(outstanding) : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-text-secondary">{inv.date}</td>
                          <td className="px-5 py-3.5">
                            <Badge variant={statusStyles[inv.status]} className="text-[11px]">
                              {inv.status === "Partial" ? <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />{inv.status}</span> :
                               inv.status === "Paid" ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{inv.status}</span> :
                               inv.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              href={`/admin/billing/${inv.id}`}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-primary font-medium hover:bg-primary/5 transition-colors"
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
        </CardContent>
      </Card>

      <CreateInvoiceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => fetchInvoices()}
      />
    </div>
  );
}
