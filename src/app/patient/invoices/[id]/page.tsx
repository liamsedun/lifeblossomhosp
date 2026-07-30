"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, CreditCard, Download, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoice } from "@/hooks/use-billing";
import PayNowButton from "@/components/payments/pay-now-button";

const statusColors: Record<string, string> = {
  paid: "text-accent bg-accent-light",
  pending: "text-warning bg-warning-light",
  partially_paid: "text-warning bg-warning-light",
  cancelled: "text-text-secondary bg-muted",
  refunded: "text-danger bg-danger-light",
  draft: "text-text-secondary bg-muted",
};

const statusLabels: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  partially_paid: "Partially Paid",
  cancelled: "Cancelled",
  refunded: "Refunded",
  draft: "Draft",
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: invoice, loading } = useInvoice(id);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Invoice not found.</p>
        <Link href="/patient/payments" className="text-primary text-sm mt-2 inline-block">Back to Payments</Link>
      </div>
    );
  }

  const outstanding = invoice.total_amount - invoice.paid_amount;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link
        href="/patient/payments"
        className="inline-flex items-center gap-1.5 text-sm text-primary font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Payments
      </Link>

      {/* Header card */}
      <div className="bg-card border border-border rounded-xl card-shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-text-secondary">Invoice</p>
            <h2 className="text-lg font-bold text-foreground">{invoice.invoice_number}</h2>
          </div>
          <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", statusColors[invoice.status] || "bg-muted text-text-secondary")}>
            {statusLabels[invoice.status] || invoice.status}
          </span>
        </div>

        <div className="space-y-2 text-sm border-t border-border pt-3">
          <div className="flex justify-between">
            <span className="text-text-secondary">Issue Date</span>
            <span className="font-medium">{new Date(invoice.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          {invoice.due_date && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Due Date</span>
              <span className="font-medium">{new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Services</h3>
          </div>
          <div className="hidden sm:grid grid-cols-4 gap-0 px-4 py-2 bg-muted/50 text-xs font-medium text-text-secondary border-b border-border">
            <span className="col-span-2">Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-border">
            {invoice.items.map((item) => (
              <div key={item.id} className="px-4 py-2.5 grid grid-cols-4 gap-2 text-sm">
                <span className="col-span-2 font-medium text-foreground">{item.description}</span>
                <span className="text-right text-text-secondary">{item.quantity}</span>
                <span className="text-right font-semibold text-foreground">₦{item.total_price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl card-shadow p-4">
        <div className="space-y-2 text-sm">
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
          <div className="flex justify-between font-bold text-base border-t border-border pt-2">
            <span>Total</span>
            <span>₦{invoice.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-accent font-semibold">
            <span>Paid</span>
            <span>₦{invoice.paid_amount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && (
            <div className="flex justify-between text-warning font-bold text-base border-t border-border pt-2">
              <span>Outstanding</span>
              <span>₦{outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment History for this invoice */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-text-secondary" />
            <h3 className="text-sm font-semibold text-foreground">Payments on this Invoice</h3>
          </div>
          <div className="divide-y divide-border">
            {invoice.payments.map((pmt) => (
              <div key={pmt.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", pmt.status === "completed" ? "bg-accent-light" : "bg-warning-light")}>
                    {pmt.status === "completed" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-warning" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{pmt.payment_method}</p>
                    <p className="text-xs text-text-secondary">{new Date(pmt.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                <span className="font-semibold text-foreground">₦{pmt.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {outstanding > 0 && (
          <PayNowButton
            invoiceId={invoice.id}
            patientId={invoice.patient_id}
            amount={outstanding}
            className="flex-1 h-11 text-sm"
          />
        )}
        <button
          onClick={() => window.print()}
          className="h-11 px-4 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="h-8" />
    </div>
  );
}
