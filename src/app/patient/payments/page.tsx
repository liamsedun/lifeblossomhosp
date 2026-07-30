"use client";

import { useState } from "react";
import { CreditCard, Download, ArrowUpRight, ArrowDownRight, ChevronRight, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices, usePayments } from "@/hooks/use-billing";

const statusColors: Record<string, string> = {
  completed: "text-accent bg-accent-light",
  paid: "text-accent bg-accent-light",
  pending: "text-warning bg-warning-light",
  failed: "text-danger bg-danger-light",
  refunded: "text-text-secondary bg-muted",
};

const statusLabels: Record<string, string> = {
  completed: "Paid",
  paid: "Paid",
  pending: "Pending",
  failed: "Overdue",
  refunded: "Refunded",
};

export default function PaymentsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: invoices, loading: invLoading } = useInvoices();
  const { data: payments, loading: payLoading } = usePayments();

  const loading = invLoading || payLoading;

  const totalPaid = (payments ?? [])
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingTotal = (invoices ?? [])
    .filter((inv) => inv.status === "pending" || inv.status === "partially_paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  const sortedPayments = (payments ?? [])
    .slice()
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  const lastPayment = sortedPayments[0];

  const summaryCards = [
    { label: "Total Paid", value: loading ? "..." : `₦${totalPaid.toLocaleString()}`, icon: ArrowUpRight, color: "text-accent", bg: "bg-accent-light" },
    { label: "Outstanding", value: loading ? "..." : `₦${outstandingTotal.toLocaleString()}`, icon: ArrowDownRight, color: "text-warning", bg: "bg-warning-light" },
    { label: "Last Payment", value: loading ? "..." : lastPayment ? `₦${lastPayment.amount.toLocaleString()}` : "None", icon: CreditCard, color: "text-primary", bg: "bg-primary-lighter" },
  ];

  const displayPayments = sortedPayments.length > 0 ? sortedPayments : [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Payments & Billing</h2>

      <div className="grid grid-cols-3 gap-2.5">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-3 card-shadow text-center">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2", card.bg)}>
              <card.icon className={cn("w-4 h-4", card.color)} />
            </div>
            <p className="text-xs text-text-secondary">{card.label}</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
          <Receipt className="w-4 h-4 text-text-secondary" />
        </div>
        <div className="hidden sm:grid grid-cols-4 gap-0 px-4 py-2.5 bg-muted/50 text-xs font-medium text-text-secondary border-b border-border">
          <span>Date</span>
          <span>Service</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Status</span>
        </div>
        <div className="divide-y divide-border">
          {displayPayments.length > 0 ? displayPayments.map((pmt) => (
            <div key={pmt.id}>
              <button
                onClick={() => setExpandedId(expandedId === pmt.id ? null : pmt.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {pmt.invoice?.items?.[0]?.description || pmt.invoice?.invoice_number || `Payment #${pmt.reference_number || pmt.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {new Date(pmt.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground">₦{pmt.amount.toLocaleString()}</span>
                  <span
                    className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", statusColors[pmt.status] || "bg-muted text-text-secondary")}
                  >
                    {statusLabels[pmt.status] || pmt.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
              </button>
              {expandedId === pmt.id && (
                <div className="px-4 pb-3 pt-0">
                  <button className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                    <Download className="w-3.5 h-3.5" />
                    Download Receipt
                  </button>
                </div>
              )}
            </div>
          )) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-text-secondary">{loading ? "Loading..." : "No payment history yet."}</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-16" />

      <button className="fixed bottom-20 left-4 right-4 z-30 max-w-lg mx-auto h-12 bg-primary text-white text-sm font-semibold rounded-xl shadow-lg hover:bg-primary-dark transition-all hover:scale-[1.02] active:scale-[0.98]">
        Pay Now
      </button>
    </div>
  );
}
