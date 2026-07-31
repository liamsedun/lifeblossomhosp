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

interface OrgProfile {
  name: string;
  logo_url: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
}

const DEFAULT_ORG: OrgProfile = {
  name: "Life Blossom Hospital",
  logo_url: null,
  address: "",
  phone: "",
  email: "",
  website: "",
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

// ─── Invoice Document (screen + print) ──────────────────────────

function InvoiceDocument({ invoice, org }: { invoice: Invoice; org: OrgProfile }) {
  const outstanding = invoice.total_amount - invoice.paid_amount;
  const patientName = invoice.patient?.user
    ? `${invoice.patient.user.first_name} ${invoice.patient.user.last_name}`
    : "Unknown";
  const patient = invoice.patient;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 print:p-0 print:rounded-none print:border-0 print:bg-white print:shadow-none print:text-black" id="invoice-print">
      {/* Hospital header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b-2 border-[#e0a84a]/60 print:border-black/20">
        <div className="flex items-start gap-3">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-lg object-cover print:w-14 print:h-14" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[#e0a84a]/10 print:bg-gray-100 flex items-center justify-center">
              <Receipt className="w-7 h-7 text-[#e0a84a] print:text-gray-700" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-white print:text-black">{org.name}</h1>
            {org.address && <p className="text-xs text-white/60 print:text-gray-600">{org.address}</p>}
            <p className="text-xs text-white/60 print:text-gray-600">
              {[org.phone && `Tel: ${org.phone}`, org.email && org.email].filter(Boolean).join("  •  ")}
            </p>
            {org.website && <p className="text-xs text-white/60 print:text-gray-600">{org.website}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 print:text-gray-500">Medical Invoice</p>
          <h2 className="text-2xl font-black text-white print:text-black">{invoice.invoice_number}</h2>
          <p className="text-xs text-white/60 print:text-gray-600 mt-1">
            Date: {formatDate(invoice.issue_date)}
            {invoice.due_date ? `  •  Due: ${formatDate(invoice.due_date)}` : ""}
          </p>
          <div className="mt-1.5 inline-block print:hidden">
            <Badge variant={statusStyles[invoice.status] || "secondary"} className="text-xs">
              {statusLabels[invoice.status] || invoice.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Bill to + attending */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 print:text-gray-500 font-semibold mb-1">Bill To</p>
          <p className="text-sm font-bold text-white print:text-black">{patientName}</p>
          {patient?.patient_number && (
            <p className="text-xs text-white/60 print:text-gray-600">Patient ID: {patient.patient_number}</p>
          )}
          {patient?.user?.email && (
            <p className="text-xs text-white/60 print:text-gray-600">{patient.user.email}</p>
          )}
          {patient?.user?.phone && (
            <p className="text-xs text-white/60 print:text-gray-600">{patient.user.phone}</p>
          )}
          {(patient?.address || patient?.city || patient?.state) && (
            <p className="text-xs text-white/60 print:text-gray-600">
              {[patient.address, patient.city, patient.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/40 print:text-gray-500 font-semibold mb-1">Attending</p>
          {invoice.attending_staff ? (
            <>
              <p className="text-sm font-bold text-white print:text-black">
                {invoice.attending_staff.first_name} {invoice.attending_staff.last_name}
              </p>
              <p className="text-xs text-white/60 print:text-gray-600 capitalize">
                {invoice.attending_staff.role.replace("_", " ")}
              </p>
            </>
          ) : (
            <p className="text-xs text-white/40 print:text-gray-400">—</p>
          )}
        </div>
      </div>

      {/* Line items */}
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-y border-white/[0.08] print:border-gray-400 text-left text-[11px] uppercase tracking-wider text-white/40 print:text-gray-600">
            <th className="py-2 font-semibold">Item / Description</th>
            <th className="py-2 font-semibold text-center">Qty</th>
            <th className="py-2 font-semibold text-right">Unit Price</th>
            <th className="py-2 font-semibold text-right">VAT %</th>
            <th className="py-2 font-semibold text-right">VAT (₦)</th>
            <th className="py-2 font-semibold text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item) => (
            <tr key={item.id} className="border-b border-white/[0.04] print:border-gray-300">
              <td className="py-2.5 text-sm font-medium text-white print:text-black">{item.description}</td>
              <td className="py-2.5 text-sm text-center text-white/60 print:text-gray-700">{item.quantity}</td>
              <td className="py-2.5 text-sm text-right text-white/60 print:text-gray-700">₦{item.unit_price.toLocaleString()}</td>
              <td className="py-2.5 text-sm text-right text-white/60 print:text-gray-700">{item.vat_percent || 0}%</td>
              <td className="py-2.5 text-sm text-right text-white/60 print:text-gray-700">₦{Number(item.vat_amount || 0).toLocaleString()}</td>
              <td className="py-2.5 text-sm text-right font-semibold text-white print:text-black">₦{item.total_price.toLocaleString()}</td>
            </tr>
          ))}
          {(!invoice.items || invoice.items.length === 0) && (
            <tr>
              <td colSpan={6} className="py-3 text-sm text-white/40 print:text-gray-500">No line items.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full sm:w-72 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50 print:text-gray-600">Sub Total</span>
            <span className="text-white print:text-black">₦{invoice.subtotal.toLocaleString()}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-white/50 print:text-gray-600">Discount</span>
              <span className="text-red-400 print:text-red-600">-₦{invoice.discount_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-white/50 print:text-gray-600">VAT Amount</span>
            <span className="text-white print:text-black">₦{invoice.tax_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-white/[0.08] print:border-gray-400 pt-1.5">
            <span className="text-white print:text-black">Total Due</span>
            <span className="text-white print:text-black">₦{invoice.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-emerald-400 print:text-green-700 font-semibold">
            <span>Paid</span>
            <span>₦{invoice.paid_amount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && invoice.status !== "cancelled" && (
            <div className="flex justify-between text-amber-400 print:text-amber-700 font-bold border-t border-white/[0.08] print:border-gray-400 pt-1.5">
              <span>Balance Due</span>
              <span>₦{outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-4 pt-3 border-t border-white/[0.06] print:border-gray-300">
          <p className="text-[10px] uppercase tracking-wider text-white/40 print:text-gray-500 font-semibold">Notes</p>
          <p className="text-sm text-white/80 print:text-gray-700 mt-0.5">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] print:border-gray-300 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
          ) : (
            <Receipt className="w-4 h-4 text-[#e0a84a] print:text-gray-500" />
          )}
          <span className="text-xs text-white/60 print:text-gray-600">{org.name}</span>
        </div>
        <p className="text-xs text-white/40 print:text-gray-500">
          {[org.email, org.website].filter(Boolean).join("  •  ")}{org.email || org.website ? "  •  " : ""}
          bills@lifeblossomcares.com.ng
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showPayment, setShowPayment] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [org, setOrg] = useState<OrgProfile>(DEFAULT_ORG);

  const invoices = usePaymentStore((s) => s.invoices);
  const loading = usePaymentStore((s) => s.loading);
  const fetchInvoices = usePaymentStore((s) => s.fetchInvoices);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setOrg({
            name: json.data.name || DEFAULT_ORG.name,
            logo_url: json.data.logo_url || null,
            address: json.data.address || "",
            phone: json.data.phone || "",
            email: json.data.email || "",
            website: json.data.website || "",
          });
        }
      })
      .catch(() => {});
  }, []);

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

  const isActive = invoice.status === "pending" || invoice.status === "partially_paid";

  return (
    <div className="max-w-3xl space-y-5 print:space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
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

      {/* Invoice document */}
      <InvoiceDocument invoice={invoice} org={org} />

      {/* Payment Timeline (screen only) */}
      <div className="print:hidden">
        <PaymentTimeline payments={invoice.payments || []} />
      </div>

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
