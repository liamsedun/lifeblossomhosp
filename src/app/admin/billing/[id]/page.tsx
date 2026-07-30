"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, CreditCard, Download, CheckCircle, Clock, AlertCircle, Printer, DollarSign, Loader2 } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
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
      await recordPayment({
        invoice_id: invoice.id,
        patient_id: invoice.patient_id,
        amount: num,
        payment_method: method,
        transaction_ref: ref || undefined,
      });
      onSuccess();
      onClose();
      setAmount("");
      setRef("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Record Payment</DialogTitle>
          <DialogDescription className="text-white/50">{invoice.invoice_number}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between p-3 bg-white/[0.04] rounded-lg">
            <span className="text-white/50">Outstanding</span>
            <span className="font-bold text-amber-400">{formatCurrency(outstanding)}</span>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1 block">Amount (₦)</label>
            <Input type="number" min={0} max={outstanding} placeholder="0.00"
              className="h-9 bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1 block">Method</label>
            <div className="grid grid-cols-2 gap-2">
              {["cash", "transfer", "card", "mobile_money"].map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={cn(
                    "h-9 rounded-lg text-xs font-medium border capitalize transition-colors",
                    method === m
                      ? "border-[#e0a84a]/40 bg-[#e0a84a]/10 text-[#e0a84a]"
                      : "border-white/[0.08] text-white/50 hover:bg-white/[0.04]"
                  )}>
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 mb-1 block">Reference</label>
            <Input placeholder="Transaction ref"
              className="h-9 bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
              value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}
            className="border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !amount || parseFloat(amount) <= 0}
            className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold">
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

  const sorted = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-white/50" />
        <h3 className="text-sm font-semibold text-white">Payment Timeline</h3>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {sorted.map((pmt, idx) => (
          <div key={pmt.id} className="px-4 py-3 flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                pmt.status === "completed" ? "bg-emerald-500/10" : "bg-amber-500/10"
              )}>
                {pmt.status === "completed"
                  ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                  : <Clock className="w-4 h-4 text-amber-400" />
                }
              </div>
              {idx < sorted.length - 1 && <div className="w-px flex-1 bg-white/[0.06] min-h-[24px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white capitalize">{pmt.payment_method}</p>
                <span className="text-sm font-bold text-emerald-400">+₦{pmt.amount.toLocaleString()}</span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                {new Date(pmt.payment_date).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {pmt.transaction_ref && (
                <p className="text-xs text-white/50 mt-0.5">Ref: {pmt.transaction_ref}</p>
              )}
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
    } catch (e: any) {
      alert(e.message);
    } finally {
      setVoiding(false);
    }
  };

  if (loading && !invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#e0a84a]" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <Receipt className="w-12 h-12 text-white/30 mx-auto mb-3" />
        <p className="text-white/50">Invoice not found.</p>
        <Link href="/admin/billing" className="text-[#e0a84a] text-sm mt-2 inline-block hover:underline">
          Back to Billing
        </Link>
      </div>
    );
  }

  const outstanding = invoice.total_amount - invoice.paid_amount;
  const isActive = invoice.status === "pending" || invoice.status === "partially_paid";
  const patientName = invoice.patient?.user
    ? `${invoice.patient.user.first_name} ${invoice.patient.user.last_name}`
    : "Unknown";

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin/billing"
          className="inline-flex items-center gap-1.5 text-sm text-[#e0a84a] font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" />Billing
        </Link>
        <div className="flex gap-1.5">
          {isActive && (
            <Button size="sm" variant="outline" className="h-8 text-xs border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white"
              onClick={() => setShowPayment(true)}>
              <DollarSign className="w-3.5 h-3.5 mr-1" />Record Payment
            </Button>
          )}
          {isActive && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
              disabled={voiding} onClick={handleVoid}>
              {voiding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Void
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white"
            onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" />Print
          </Button>
        </div>
      </div>

      {/* Invoice card */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 print:p-0" id="invoice-print">
        {/* Header section */}
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-white/[0.06]">
          <div>
            <p className="text-xs text-white/50">INVOICE</p>
            <h2 className="text-xl font-bold text-white">{invoice.invoice_number}</h2>
            <p className="text-sm text-white/50 mt-0.5">Issued: {formatDate(invoice.issue_date)}</p>
            {invoice.due_date && (
              <p className="text-sm text-white/50">Due: {formatDate(invoice.due_date)}</p>
            )}
          </div>
          <div className="text-right">
            <Badge variant={statusStyles[invoice.status] || "secondary"} className="text-xs">
              {statusLabels[invoice.status] || invoice.status}
            </Badge>
            {outstanding > 0 && invoice.status !== "cancelled" && (
              <p className="text-xs text-amber-400 font-medium mt-1">{formatCurrency(outstanding)} outstanding</p>
            )}
          </div>
        </div>

        {/* Patient info */}
        <div className="mb-5">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Patient</p>
          <p className="text-sm font-semibold text-white">{patientName}</p>
          {invoice.patient?.patient_number && (
            <p className="text-xs text-white/50">{invoice.patient.patient_number}</p>
          )}
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-white/40">
              <th className="pb-2 font-medium">Service</th>
              <th className="pb-2 font-medium text-center">Qty</th>
              <th className="pb-2 font-medium text-right">Unit Price</th>
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item) => (
              <tr key={item.id} className="border-b border-white/[0.04]">
                <td className="py-2.5 text-sm font-medium text-white">{item.description}</td>
                <td className="py-2.5 text-sm text-center text-white/50">{item.quantity}</td>
                <td className="py-2.5 text-sm text-right text-white/50">₦{item.unit_price.toLocaleString()}</td>
                <td className="py-2.5 text-sm text-right font-semibold text-white">₦{item.total_price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-white/[0.06] pt-3 space-y-1.5 text-sm ml-auto w-64">
          <div className="flex justify-between">
            <span className="text-white/50">Subtotal</span>
            <span className="text-white">₦{invoice.subtotal.toLocaleString()}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-white/50">Discount</span>
              <span className="text-red-400">-₦{invoice.discount_amount.toLocaleString()}</span>
            </div>
          )}
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-white/50">Tax</span>
              <span className="text-white">₦{invoice.tax_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-white/[0.06] pt-1.5">
            <span className="text-white">Total</span>
            <span className="text-white">₦{invoice.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-emerald-400 font-semibold">
            <span>Paid</span>
            <span>₦{invoice.paid_amount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && invoice.status !== "cancelled" && (
            <div className="flex justify-between text-amber-400 font-bold border-t border-white/[0.06] pt-1.5">
              <span>Outstanding</span>
              <span>₦{outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>

        {invoice.notes && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/50">Notes</p>
            <p className="text-sm text-white/80 mt-0.5">{invoice.notes}</p>
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
