"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CreditCard, Landmark, Smartphone, CheckCircle2,
  Loader2, Copy, AlertTriangle, Building2, Phone, MapPin, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/api-types";

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
}

interface OrgInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

function Modal({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#0d1322] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="w-full flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 hover:border-[#e0a84a]/40 transition-all"
    >
      <span className="text-left">
        <span className="block text-[10px] uppercase tracking-wider text-white/40 font-semibold">{label}</span>
        <span className="block text-sm font-bold text-white mt-0.5">{value}</span>
      </span>
      {copied ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <Copy className="w-4 h-4 text-white/40 shrink-0" />
      )}
    </button>
  );
}

export default function PayInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [org, setOrg] = useState<OrgInfo>({ name: "Life Blossom Hospital", address: "", phone: "", email: "" });
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showBank, setShowBank] = useState(false);
  const [showPos, setShowPos] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [declared, setDeclared] = useState<{ ref: string } | null>(null);
  const [paystackBusy, setPaystackBusy] = useState(false);
  const [paystackNotice, setPaystackNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/invoices?page_size=100").then((r) => r.json()),
      fetch("/api/org").then((r) => r.json()),
      fetch("/api/settings/bank-accounts").then((r) => r.json()),
    ])
      .then(([invJson, orgJson, bankJson]) => {
        const found = (invJson.data || []).find((i: Invoice) => i.id === invoiceId);
        if (!found) setNotFound(true);
        else setInvoice(found);
        if (orgJson.success) {
          setOrg({
            name: orgJson.data.name || "Life Blossom Hospital",
            address: orgJson.data.address || "",
            phone: orgJson.data.phone || "",
            email: orgJson.data.email || "",
          });
        }
        if (bankJson.success) setAccounts(bankJson.data.accounts || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 space-y-3 px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h2 className="text-lg font-bold text-white">Invoice not found</h2>
        <p className="text-sm text-white/50">This invoice may have been settled or removed.</p>
        <Link href="/patient/payments" className="mt-2 h-10 px-5 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Payments
        </Link>
      </div>
    );
  }

  if (loading || !invoice) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-40 bg-white/[0.06] rounded animate-pulse" />
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3 animate-pulse">
          <div className="h-4 w-2/3 bg-white/[0.06] rounded" />
          <div className="h-8 w-1/2 bg-white/[0.06] rounded" />
        </div>
      </div>
    );
  }

  const outstanding = invoice.total_amount - invoice.paid_amount;
  const alreadyPaid = invoice.status === "paid" || outstanding <= 0;

  const handlePaystack = async () => {
    setPaystackBusy(true);
    setPaystackNotice("");
    setError("");
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          patient_id: invoice.patient_id,
          email: "patient@lifeblossom.com",
          amount: outstanding,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setPaystackNotice(json.error || "Paystack is unavailable right now");
        return;
      }
      if (json.data.placeholder) {
        setPaystackNotice(json.data.message || "Online card payment is coming soon.");
        return;
      }
      window.location.href = json.data.authorization_url;
    } catch {
      setPaystackNotice("Could not reach the payment gateway. Please try Bank Transfer or POS.");
    } finally {
      setPaystackBusy(false);
    }
  };

  const handleDeclare = async () => {
    setDeclaring(true);
    setError("");
    try {
      const res = await fetch("/api/payments/declare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId, amount: outstanding }),
      });
      const json = await res.json();
      if (json.success) {
        setDeclared({ ref: json.data.transaction_ref || "" });
      } else {
        setError(json.error || "Failed to declare the transfer");
      }
    } catch {
      setError("Network error");
    } finally {
      setDeclaring(false);
    }
  };

  const methods = [
    {
      key: "paystack",
      title: "Paystack",
      desc: "Pay securely online with your card (Visa, Mastercard, Verve).",
      icon: CreditCard,
      accent: "from-sky-500 to-blue-600",
      action: handlePaystack,
    },
    {
      key: "bank",
      title: "Bank Transfer",
      desc: "Transfer to the hospital's bank account and declare it here.",
      icon: Landmark,
      accent: "from-emerald-500 to-teal-600",
      action: () => setShowBank(true),
    },
    {
      key: "pos",
      title: "POS",
      desc: "Pay with your card at the hospital counter via POS terminal.",
      icon: Smartphone,
      accent: "from-violet-500 to-purple-600",
      action: () => setShowPos(true),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/patient/payments" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-white/50 hover:text-white transition-colors" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">Pay Invoice</h2>
          <p className="text-xs text-white/40">Choose how you'd like to pay</p>
        </div>
      </div>

      {alreadyPaid ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">This invoice is fully settled</h3>
          <p className="text-sm text-white/50 mt-1">
            {invoice.invoice_number} · ₦{invoice.total_amount.toLocaleString()} paid
          </p>
          <Link
            href="/patient/payments"
            className="mt-4 inline-flex h-10 px-5 items-center justify-center bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl"
          >
            Back to Payments
          </Link>
        </div>
      ) : (
        <>
          <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0b2a4a] via-[#0e3a63] to-[#0d5f7a] p-5 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e0a84a]/[0.08]" />
            <p className="text-xs text-white/50">{invoice.invoice_number}</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {invoice.items?.[0]?.description || "Medical Service"}
              {invoice.items && invoice.items.length > 1 && ` +${invoice.items.length - 1} more`}
            </p>
            <p className="text-2xl font-bold text-white mt-2">
              ₦{outstanding.toLocaleString()}
              <span className="text-xs font-medium text-white/40 ml-2">outstanding</span>
            </p>
            <p className="text-[11px] text-white/50 mt-1">
              Paid so far: ₦{invoice.paid_amount.toLocaleString()} · Total: ₦{invoice.total_amount.toLocaleString()}
            </p>
          </div>

          <div className="grid gap-3">
            {methods.map((m) => (
              <button
                key={m.key}
                onClick={m.action}
                className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 text-left hover:border-[#e0a84a]/40 hover:-translate-y-0.5 transition-all"
              >
                <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg shrink-0", m.accent)}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{m.title}</p>
                  <p className="text-xs text-white/50 mt-0.5">{m.desc}</p>
                </div>
                <span className="text-[#e0a84a] font-semibold text-sm group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-white/30 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" />
            Payments are confirmed by hospital staff and your account is settled automatically.
          </p>
        </>
      )}

      {/* ── Bank Transfer popup ── */}
      <Modal open={showBank} onClose={() => setShowBank(false)}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-lg font-bold text-white">Bank Transfer</h3>
            <p className="text-xs text-white/40">Transfer and declare your payment</p>
          </div>
          <button onClick={() => setShowBank(false)} className="p-2 rounded-xl hover:bg-white/[0.06] text-white/50">
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {declared ? (
          <div className="mt-4 text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h4 className="text-base font-bold text-white">Transfer declared</h4>
            <p className="text-xs text-white/50 mt-1 max-w-[280px] mx-auto">
              Reference <span className="text-[#e0a84a] font-mono font-semibold">{declared.ref}</span> — our
              accountants have been notified and will confirm your payment shortly.
            </p>
            <button
              onClick={() => { setShowBank(false); setDeclared(null); }}
              className="mt-5 w-full h-11 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-[#e0a84a]/[0.06] border border-[#e0a84a]/20 px-3 py-2.5 text-xs text-[#e0a84a] mb-4">
              Amount to pay: <span className="font-bold">₦{outstanding.toLocaleString()}</span> for {invoice.invoice_number}
            </div>

            {accounts.length === 0 ? (
              <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/20 p-4 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="text-xs text-white/60">
                  No hospital bank accounts have been set up yet — please use the POS counter or Paystack.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Transfer to any of these accounts</p>
                {accounts.map((acc) => (
                  <div key={acc.id} className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-[#e0a84a]" /> {acc.bank_name}
                    </p>
                    <CopyRow label="Account Name" value={acc.account_name} />
                    <CopyRow label="Account Number" value={acc.account_number} />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
            )}

            {accounts.length > 0 && (
              <button
                onClick={handleDeclare}
                disabled={declaring}
                className="mt-4 w-full h-11 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl shadow-lg shadow-[#e0a84a]/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {declaring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {declaring ? "Declaring..." : "I've completed the transfer"}
              </button>
            )}
          </>
        )}
      </Modal>

      {/* ── POS popup ── */}
      <Modal open={showPos} onClose={() => setShowPos(false)}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-lg font-bold text-white">Pay with POS</h3>
            <p className="text-xs text-white/40">At the hospital counter</p>
          </div>
          <button onClick={() => setShowPos(false)} className="p-2 rounded-xl hover:bg-white/[0.06] text-white/50">
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{org.name}</p>
              <p className="text-xs text-white/40">{invoice.invoice_number} · ₦{outstanding.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Visit the hospital reception or billing desk and pay with your card via our POS terminal.
            Our staff will confirm your payment and your account will be settled right away.
          </p>
          {org.address && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <MapPin className="w-3.5 h-3.5 text-[#e0a84a]" /> {org.address}
            </div>
          )}
          {org.phone && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Phone className="w-3.5 h-3.5 text-[#e0a84a]" /> {org.phone}
            </div>
          )}
        </div>

        <button
          onClick={() => { setShowPos(false); router.push("/patient/payments"); }}
          className="mt-4 w-full h-11 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl"
        >
          Got it
        </button>
      </Modal>

      {/* ── Paystack notice ── */}
      {paystackNotice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0d1322] border border-white/[0.08] rounded-3xl shadow-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6 text-sky-400" />
            </div>
            <h3 className="text-base font-bold text-white">Paystack</h3>
            <p className="text-xs text-white/50 mt-1.5">{paystackNotice}</p>
            {paystackBusy && <Loader2 className="w-5 h-5 animate-spin text-[#e0a84a] mx-auto mt-3" />}
            <button
              onClick={() => setPaystackNotice("")}
              className="mt-4 w-full h-11 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
