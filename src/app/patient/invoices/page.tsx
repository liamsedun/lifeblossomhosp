"use client";

import Link from "next/link";
import { Receipt, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/use-billing";
import { useState } from "react";

const statusColors: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  partially_paid: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cancelled: "bg-white/[0.04] text-white/40 border-white/[0.06]",
  refunded: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  draft: "bg-white/[0.04] text-white/40 border-white/[0.06]",
};

const statusLabels: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  partially_paid: "Partial",
  cancelled: "Cancelled",
  refunded: "Refunded",
  draft: "Draft",
};

const filters = ["All", "Pending", "Paid", "Partial"] as const;
type FilterValue = (typeof filters)[number];

const filterStatusMap: Record<FilterValue, string | undefined> = {
  All: undefined,
  Pending: "pending",
  Paid: "paid",
  Partial: "partially_paid",
};

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.04] to-transparent" />
      {children}
    </div>
  );
}

export default function PatientInvoicesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");
  const { data: invoices, loading } = useInvoices(
    filterStatusMap[activeFilter] ? { status: filterStatusMap[activeFilter] } : undefined
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">My Bills</h2>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "h-8 px-4 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
              activeFilter === f
                ? "bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] shadow-lg shadow-[#e0a84a]/20"
                : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] border border-white/[0.06]"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.04] animate-pulse" />
          ))
        ) : invoices && invoices.length > 0 ? (
          invoices.map((inv) => {
            const outstanding = inv.total_amount - inv.paid_amount;
            return (
              <Link
                key={inv.id}
                href={`/patient/invoices/${inv.id}`}
                className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e0a84a]/5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{inv.invoice_number}</p>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", statusColors[inv.status] || "bg-white/[0.04] text-white/40 border-white/[0.06]")}>
                        {statusLabels[inv.status] || inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                      {inv.items?.[0]?.description || "Medical Service"}
                      {inv.items && inv.items.length > 1 && ` +${inv.items.length - 1} more`}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {new Date(inv.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-white">₦{inv.total_amount.toLocaleString()}</p>
                    {outstanding > 0 && inv.status !== "paid" && (
                      <p className="text-[11px] text-amber-400 font-medium">₦{outstanding.toLocaleString()} due</p>
                    )}
                    {inv.status === "paid" && (
                      <p className="text-[11px] text-emerald-400 font-medium">Cleared</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <GlassCard>
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 text-white/30 mx-auto mb-3" />
              <p className="text-sm text-white/40">No bills found.</p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
