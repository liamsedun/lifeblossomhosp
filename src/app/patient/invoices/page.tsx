"use client";

import Link from "next/link";
import { Receipt, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/use-billing";
import { useState } from "react";

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

export default function PatientInvoicesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");
  const { data: invoices, loading } = useInvoices(
    filterStatusMap[activeFilter] ? { status: filterStatusMap[activeFilter] } : undefined
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">My Bills</h2>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              activeFilter === f
                ? "bg-primary text-white"
                : "bg-muted text-text-secondary hover:bg-muted/80"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))
        ) : invoices && invoices.length > 0 ? (
          invoices.map((inv) => {
            const outstanding = inv.total_amount - inv.paid_amount;
            return (
              <Link
                key={inv.id}
                href={`/patient/invoices/${inv.id}`}
                className="block bg-card border border-border rounded-xl p-4 card-shadow hover:card-shadow-hover transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{inv.invoice_number}</p>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", statusColors[inv.status] || "bg-muted text-text-secondary")}>
                        {statusLabels[inv.status] || inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {inv.items?.[0]?.description || "Medical Service"}
                      {inv.items && inv.items.length > 1 && ` +${inv.items.length - 1} more`}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {new Date(inv.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-foreground">₦{inv.total_amount.toLocaleString()}</p>
                    {outstanding > 0 && inv.status !== "paid" && (
                      <p className="text-[11px] text-warning font-medium">₦{outstanding.toLocaleString()} due</p>
                    )}
                    {inv.status === "paid" && (
                      <p className="text-[11px] text-accent font-medium">Cleared</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <Receipt className="w-10 h-10 text-text-secondary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">No bills found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
