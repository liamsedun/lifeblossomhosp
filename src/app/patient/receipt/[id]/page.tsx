"use client";

import { useEffect, use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, Download, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import type { Invoice } from "@/lib/api-types";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        const json = await res.json();
        if (json.success) setInvoice(json.data);
      } catch { /* not found */ }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-secondary">Receipt not found.</p>
        <Link href="/patient/payments" className="text-primary text-sm mt-2 inline-block">Back to Payments</Link>
      </div>
    );
  }

  const outstanding = invoice.total_amount - invoice.paid_amount;
  const payments = invoice.payments || [];

  return (
    <div className="space-y-4">
      <Link href="/patient/payments" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
        <ArrowLeft className="w-4 h-4" />Payments
      </Link>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => window.print()} className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors">
          <Printer className="w-4 h-4" />Print Receipt
        </button>
        <button onClick={() => window.print()} className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Receipt card */}
      <div className="bg-white border border-border rounded-xl card-shadow p-5 print:shadow-none print:border-0" id="receipt-print">
        {/* Header */}
        <div className="text-center mb-5 pb-4 border-b border-border">
          <Receipt className="w-8 h-8 text-primary mx-auto mb-1" />
          <h1 className="text-lg font-bold text-foreground">Life Blossom Hospital</h1>
          <p className="text-xs text-text-secondary">20 Fatade Road, Baruwa-Ipaja, Lagos</p>
          <p className="text-xs text-text-secondary">Tel: +234 801 234 5678</p>
          <h2 className="text-base font-bold text-foreground mt-3">PAYMENT RECEIPT</h2>
          <p className="text-xs text-text-secondary">{invoice.invoice_number}</p>
          <p className="text-xs text-text-secondary">Date: {formatDate(invoice.issue_date)}</p>
        </div>

        {/* Patient info */}
        <div className="mb-4 text-sm">
          <p className="font-semibold text-foreground">
            {invoice.patient?.user?.first_name} {invoice.patient?.user?.last_name}
          </p>
          {invoice.patient?.patient_number && (
            <p className="text-xs text-text-secondary">Patient No: {invoice.patient.patient_number}</p>
          )}
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-secondary">
              <th className="pb-2 font-medium">Service</th>
              <th className="pb-2 font-medium text-center">Qty</th>
              <th className="pb-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="py-2 text-sm text-foreground">{item.description}</td>
                <td className="py-2 text-sm text-center text-text-secondary">{item.quantity}</td>
                <td className="py-2 text-sm text-right font-medium">₦{item.total_price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-border pt-2 space-y-1 text-sm ml-auto w-56">
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
              <span className="text-text-secondary">VAT</span>
              <span>₦{invoice.tax_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-border pt-1">
            <span>Total</span>
            <span>₦{invoice.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-accent font-semibold">
            <span>Paid</span>
            <span>₦{invoice.paid_amount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && (
            <div className="flex justify-between text-warning font-semibold border-t border-border pt-1">
              <span>Outstanding</span>
              <span>₦{outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Payment details */}
        {payments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Payment Details</p>
            {payments.map((pmt) => (
              <div key={pmt.id} className="flex justify-between text-sm py-1">
                <div>
                  <span className="capitalize">{pmt.payment_method}</span>
                  {pmt.transaction_ref && <span className="text-text-secondary text-xs ml-2">Ref: {pmt.transaction_ref}</span>}
                </div>
                <span className="font-medium">₦{pmt.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-border text-center text-xs text-text-secondary">
          <p>Thank you for choosing Life Blossom Hospital</p>
          <p className="mt-0.5">Generated on {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>
    </div>
  );
}
