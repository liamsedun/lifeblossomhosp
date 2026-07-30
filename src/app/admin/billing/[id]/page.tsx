"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, CreditCard, Download, CheckCircle, Clock, AlertCircle, Printer, DollarSign } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { Invoice, Payment } from "@/lib/api-types";

const statusStyles: Record<string, "success" | "secondary" | "destructive" | "warning" | "outline"> = {
  paid: "success",
  pending: "secondary",
  partially_paid: "warning",
  overdue: "destructive",
  cancelled: "outline",
  draft: "secondary",
};

const statusLabels: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  partially_paid: "Partially Paid",
  draft: "Draft",
  cancelled: "Cancelled",
};

// ─── Record Payment Dialog ──────────────────────────────────────

function RecordPaymentDialog({
  invoice, open, onClose, onSuccess,
}: {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [ref, setRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const recordPayment = usePaymentStore((s) => s.recordPayment);
  const outstanding = invoice.total_amount - invoice.paid_amount;

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0 || num > outstanding) return;
    setSubmitting(true);
    try {
      await recordPayment({ invoice_id: invoice.id, patient_id: invoice.patient_id, amount: num, payment_method: method, transaction_ref: ref || undefined });
      onSuccess();
      onClose();
      setAmount(""); setRef("");
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>{invoice.invoice_number}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-text-secondary">Outstanding</span>
            <span className="font-bold text-warning">{formatCurrency(outstanding)}</span>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1">Amount (₦)</label>
            <Input type="number" min={0} max={outstanding} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1">Method</label>
            <div className="grid grid-cols-2 gap-2">
              {["cash", "transfer", "card", "mobile_money"].map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={cn("h-9 rounded-lg text-xs font-medium border capitalize transition-colors", method === m ? "border-primary bg-primary/5 text-primary" : "border-border text-text-secondary")}>
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1">Reference</label>
            <Input placeholder="Transaction ref" value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !amount || parseFloat(amount) <= 0}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Timeline ───────────────────────────────────────────

function PaymentTimeline({ payments }: { payments: Payment[] }) {
  if (!payments || payments.length === 0) return null;

  const sorted = [...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  return (
    <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-text-secondary" />
        <h3 className="text-sm font-semibold text-foreground">Payment Timeline</h3>
      </div>
      <div className="divide-y divide-border">
        {sorted.map((pmt, idx) => (
          <div key={pmt.id} className="px-4 py-3 flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", pmt.status === "completed" ? "bg-accent-light" : "bg-warning-light")}>
                {pmt.status === "completed" ? <CheckCircle className="w-4 h-4 text-accent" /> : <Clock className="w-4 h-4 text-warning" />}
              </div>
              {idx < sorted.length - 1 && <div className="w-px flex-1 bg-border min-h-[24px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground capitalize">{pmt.payment_method}</p>
                <span className="text-sm font-bold text-accent">+₦{pmt.amount.toLocaleString()}</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {new Date(pmt.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              {pmt.transaction_ref && <p className="text-xs text-text-secondary mt-0.5">Ref: {pmt.transaction_ref}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showPayment, setShowPayment] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const invoices = usePaymentStore((s) => s.invoices);
  const loading = usePaymentStore((s) => s.loading);
  const fetchInvoices = usePaymentStore((s) => s.fetchInvoices);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const invoice = invoices.find((i) => i.id === id);

  const handleVoid = async () => {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      fetchInvoices();
    } catch (e: any) { alert(e.message); }
    finally { setVoiding(false); }
  };

  if (loading && !invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <Receipt className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary">Invoice not found.</p>
        <Link href="/admin/billing" className="text-primary text-sm mt-2 inline-block">Back to Billing</Link>
      </div>
    );
  }

  const outstanding = invoice.total_amount - invoice.paid_amount;
  const isActive = invoice.status === "pending" || invoice.status === "partially_paid";
  const patientName = invoice.patient?.user ? `${invoice.patient.user.first_name} ${invoice.patient.user.last_name}` : "Unknown";

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin/billing" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
          <ArrowLeft className="w-4 h-4" />Billing
        </Link>
        <div className="flex gap-1.5">
          {isActive && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowPayment(true)}>
              <DollarSign className="w-3.5 h-3.5 mr-1" />Record Payment
            </Button>
          )}
          {isActive && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-danger border-danger/30 hover:bg-danger/5" disabled={voiding} onClick={handleVoid}>
              {voiding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Void
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" />Print
          </Button>
        </div>
      </div>

      {/* Invoice card */}
      <div className="bg-card border border-border rounded-xl card-shadow p-5 print:p-0" id="invoice-print">
        {/* Header section */}
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-border">
          <div>
            <p className="text-xs text-text-secondary">INVOICE</p>
            <h2 className="text-xl font-bold text-foreground">{invoice.invoice_number}</h2>
            <p className="text-sm text-text-secondary mt-0.5">Issued: {formatDate(invoice.issue_date)}</p>
            {invoice.due_date && <p className="text-sm text-text-secondary">Due: {formatDate(invoice.due_date)}</p>}
          </div>
          <div className="text-right">
            <Badge variant={statusStyles[invoice.status] || "secondary"} className="text-xs">
              {statusLabels[invoice.status] || invoice.status}
            </Badge>
            {outstanding > 0 && invoice.status !== "cancelled" && (
              <p className="text-xs text-warning font-medium mt-1">{formatCurrency(outstanding)} outstanding</p>
            )}
          </div>
        </div>

        {/* Patient info */}
        <div className="mb-5">
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Patient</p>
          <p className="text-sm font-semibold">{patientName}</p>
          {invoice.patient?.patient_number && <p className="text-xs text-text-secondary">{invoice.patient.patient_number}</p>}
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-secondary">
              <th className="pb-2 font-medium">Service</th>
              <th className="pb-2 font-medium text-center">Qty</th>
              <th className="pb-2 font-medium text-right">Unit Price</th>
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="py-2.5 text-sm font-medium text-foreground">{item.description}</td>
                <td className="py-2.5 text-sm text-center text-text-secondary">{item.quantity}</td>
                <td className="py-2.5 text-sm text-right text-text-secondary">₦{item.unit_price.toLocaleString()}</td>
                <td className="py-2.5 text-sm text-right font-semibold">₦{item.total_price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-border pt-3 space-y-1.5 text-sm ml-auto w-64">
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
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Tax</span>
              <span>₦{invoice.tax_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-border pt-1.5">
            <span>Total</span>
            <span>₦{invoice.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-accent font-semibold">
            <span>Paid</span>
            <span>₦{invoice.paid_amount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && invoice.status !== "cancelled" && (
            <div className="flex justify-between text-warning font-bold border-t border-border pt-1.5">
              <span>Outstanding</span>
              <span>₦{outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>

        {invoice.notes && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-text-secondary">Notes</p>
            <p className="text-sm text-foreground mt-0.5">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payment Timeline */}
      <PaymentTimeline payments={invoice.payments || []} />

      {/* Record Payment Dialog */}
      {showPayment && (
        <RecordPaymentDialog
          invoice={invoice}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => fetchInvoices()}
        />
      )}
    </div>
  );
}
