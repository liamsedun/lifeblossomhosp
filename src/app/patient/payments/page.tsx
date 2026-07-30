"use client";

import { useEffect, useState } from "react";
import { CreditCard, ArrowUpRight, ArrowDownRight, ChevronRight, Receipt, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import PayNowButton from "@/components/payments/pay-now-button";
import type { Invoice } from "@/lib/api-types";

const statusColors: Record<string, string> = {
  completed: "text-accent bg-accent-light",
  paid: "text-accent bg-accent-light",
  pending: "text-warning bg-warning-light",
  failed: "text-danger bg-danger-light",
  partially_paid: "text-warning bg-warning-light",
  refunded: "text-text-secondary bg-muted",
};

const statusLabels: Record<string, string> = {
  completed: "Paid",
  paid: "Paid",
  pending: "Pending",
  failed: "Overdue",
  partially_paid: "Partial",
  refunded: "Refunded",
};

function ReceiptPopup({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const outstanding = invoice.total_amount - invoice.paid_amount;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <Receipt className="w-10 h-10 text-primary mx-auto mb-2" />
          <h3 className="text-lg font-bold">Payment Receipt</h3>
          <p className="text-xs text-text-secondary">{invoice.invoice_number}</p>
        </div>

        <div className="space-y-3 text-sm border-t border-b border-border py-4 mb-4">
          <div className="flex justify-between">
            <span className="text-text-secondary">Issue Date</span>
            <span className="font-medium">{new Date(invoice.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Subtotal</span>
            <span>₦{invoice.subtotal.toLocaleString()}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Discount</span>
              <span className="text-danger">-₦{invoice.discount_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>₦{invoice.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-accent font-semibold">
            <span>Paid</span>
            <span>₦{invoice.paid_amount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && (
            <div className="flex justify-between text-warning font-semibold">
              <span>Outstanding</span>
              <span>₦{outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>

        {invoice.items && invoice.items.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Line Items</h4>
            {invoice.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-text-secondary">{item.quantity} x ₦{item.unit_price.toLocaleString()}</p>
                </div>
                <span className="font-medium">₦{item.total_price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => window.print()}
          className="w-full h-10 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          Print / Save PDF
        </button>
        <button
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-primary text-white text-sm font-semibold mt-2 hover:bg-primary-dark transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);

  const invoices = usePaymentStore((s) => s.invoices);
  const payments = usePaymentStore((s) => s.payments);
  const totals = usePaymentStore((s) => s.totals);
  const loading = usePaymentStore((s) => s.loading);
  const fetchInvoices = usePaymentStore((s) => s.fetchInvoices);
  const fetchPayments = usePaymentStore((s) => s.fetchPayments);

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
  }, [fetchInvoices, fetchPayments]);

  const sortedPayments = payments
    .slice()
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  const lastPayment = sortedPayments[0];

  const summaryCards = [
    { label: "Total Paid", value: loading ? "..." : `₦${totals.totalRevenue.toLocaleString()}`, icon: ArrowUpRight, color: "text-accent", bg: "bg-accent-light" },
    { label: "Outstanding", value: loading ? "..." : `₦${totals.outstandingAmount.toLocaleString()}`, icon: ArrowDownRight, color: "text-warning", bg: "bg-warning-light" },
    { label: "Last Payment", value: loading ? "..." : lastPayment ? `₦${lastPayment.amount.toLocaleString()}` : "None", icon: CreditCard, color: "text-primary", bg: "bg-primary-lighter" },
  ];

  const unpaidInvoices = invoices
    .filter((inv) => (inv.status === "pending" || inv.status === "partially_paid") && inv.total_amount - inv.paid_amount > 0);

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

      {unpaidInvoices.length > 0 && (
        <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Outstanding Bills</h3>
            <CreditCard className="w-4 h-4 text-warning" />
          </div>
          <div className="divide-y divide-border">
            {unpaidInvoices.map((inv) => {
              const outstanding = inv.total_amount - inv.paid_amount;
              return (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", statusColors[inv.status] || "bg-muted text-text-secondary")}>
                        {statusLabels[inv.status] || inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {inv.items?.[0]?.description || "Medical Service"}
                      {inv.items && inv.items.length > 1 && ` +${inv.items.length - 1} more`}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Total: ₦{inv.total_amount.toLocaleString()} &middot; Paid: ₦{inv.paid_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-sm font-bold text-warning">₦{outstanding.toLocaleString()}</span>
                    <PayNowButton
                      invoiceId={inv.id}
                      patientId={inv.patient_id}
                      amount={outstanding}
                      className="h-8 text-xs px-3"
                      onSuccess={() => { fetchInvoices(); fetchPayments(); }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          {sortedPayments.length > 0 ? sortedPayments.map((pmt) => (
            <div key={pmt.id}>
              <button
                onClick={() => setExpandedId(expandedId === pmt.id ? null : pmt.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {pmt.invoice?.items?.[0]?.description || pmt.invoice?.invoice_number || `Payment #${pmt.transaction_ref || pmt.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {new Date(pmt.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground">₦{pmt.amount.toLocaleString()}</span>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", statusColors[pmt.status] || "bg-muted text-text-secondary")}>
                    {statusLabels[pmt.status] || pmt.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
              </button>
              {expandedId === pmt.id && (
                <div className="px-4 pb-3 pt-0 flex gap-2">
                  <button
                    onClick={() => pmt.invoice && setReceiptInvoice(pmt.invoice)}
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />Receipt
                  </button>
                  {pmt.invoice && (pmt.invoice.total_amount - pmt.invoice.paid_amount > 0) && (
                    <PayNowButton
                      invoiceId={pmt.invoice.id}
                      patientId={pmt.invoice.patient_id}
                      amount={pmt.invoice.total_amount - pmt.invoice.paid_amount}
                      className="h-7 text-xs px-3"
                      onSuccess={() => { fetchInvoices(); fetchPayments(); }}
                    />
                  )}
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

      {receiptInvoice && (
        <ReceiptPopup invoice={receiptInvoice} onClose={() => setReceiptInvoice(null)} />
      )}

      <div className="h-16" />
    </div>
  );
}
