"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  DollarSign,
  TrendingUp,
  Wallet,
  Receipt,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useInvoices } from "@/hooks/use-billing";
import type { InvoiceStatus } from "@/lib/api-types";

type DisplayStatus = "Paid" | "Pending" | "Overdue" | "Partial";

interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  patient: string;
  service: string;
  amount: number;
  date: string;
  dueDate: string;
  status: DisplayStatus;
}

const statusStyles: Record<DisplayStatus, "success" | "secondary" | "destructive" | "warning"> = {
  Paid: "success",
  Pending: "secondary",
  Overdue: "destructive",
  Partial: "warning",
};

function mapStatus(apiStatus: InvoiceStatus, dueDate: string | null): DisplayStatus {
  switch (apiStatus) {
    case "paid":
      return "Paid";
    case "partially_paid":
      return "Partial";
    case "pending":
      if (dueDate && new Date(dueDate) < new Date()) return "Overdue";
      return "Pending";
    default:
      return "Pending";
  }
}

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDisplay | null>(null);
  const { data: invoicesData, loading } = useInvoices();

  const invoices = useMemo(() => {
    if (!invoicesData) return [];
    return invoicesData
      .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled" && inv.status !== "refunded")
      .map((inv) => {
        const patientName = inv.patient?.user
          ? `${inv.patient.user.first_name} ${inv.patient.user.last_name}`
          : inv.patient_id;
        return {
          id: inv.invoice_number || inv.id,
          invoiceNumber: inv.invoice_number,
          patient: patientName,
          service: inv.items?.[0]?.description || inv.notes || "Medical Service",
          amount: inv.total,
          date: inv.created_at ? formatDate(inv.created_at) : "—",
          dueDate: inv.due_date ? formatDate(inv.due_date) : "—",
          status: mapStatus(inv.status, inv.due_date),
        };
      });
  }, [invoicesData]);

  const totalRevenue = useMemo(() => {
    if (!invoicesData) return 0;
    return invoicesData
      .filter((i) => i.status === "paid" || i.status === "partially_paid")
      .reduce((sum, i) => sum + i.total, 0);
  }, [invoicesData]);

  const pendingAmount = useMemo(() => {
    if (!invoicesData) return 0;
    return invoicesData
      .filter((i) => i.status === "pending" || i.status === "partially_paid")
      .reduce((sum, i) => sum + i.total, 0);
  }, [invoicesData]);

  const thisMonth = useMemo(() => {
    if (!invoicesData) return 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    return invoicesData
      .filter((i) => i.created_at && i.created_at >= monthStart)
      .reduce((sum, i) => sum + i.total, 0);
  }, [invoicesData]);

  const summaryCards = [
    { label: "Total Revenue", value: loading ? "—" : formatCurrency(totalRevenue), icon: TrendingUp, color: "text-accent", bg: "bg-accent-light" },
    { label: "Pending Payments", value: loading ? "—" : formatCurrency(pendingAmount), icon: Wallet, color: "text-warning", bg: "bg-warning-light" },
    { label: "This Month", value: loading ? "—" : formatCurrency(thisMonth), icon: DollarSign, color: "text-primary", bg: "bg-primary-lighter" },
    { label: "Total Invoices", value: loading ? "—" : String(invoices?.length ?? 0), icon: Receipt, color: "text-secondary", bg: "bg-secondary-light" },
  ];

  const filtered = invoices.filter(
    (inv) =>
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.patient.toLowerCase().includes(search.toLowerCase()) ||
      inv.service.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage invoices and payments
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          Create Invoice
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">{card.label}</p>
                    <p className="text-xl font-bold text-foreground mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", card.bg)}>
                    <Icon className={cn("size-5", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Search invoices..."
              className="h-9 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary">
                    <th className="px-5 py-3.5 font-medium">Invoice #</th>
                    <th className="px-5 py-3.5 font-medium">Patient</th>
                    <th className="px-5 py-3.5 font-medium">Service</th>
                    <th className="px-5 py-3.5 font-medium">Amount</th>
                    <th className="px-5 py-3.5 font-medium">Date</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-text-secondary">
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-foreground">
                          {inv.id}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          {inv.patient}
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary">
                          {inv.service}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary">
                          {inv.date}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant={statusStyles[inv.status]}
                            className="text-[11px]"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-primary"
                                onClick={() => setSelectedInvoice(inv)}
                              >
                                <Eye className="size-3.5 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            {selectedInvoice?.id === inv.id && (
                              <DialogContent className="max-w-sm">
                                <DialogHeader>
                                  <DialogTitle>{selectedInvoice.id}</DialogTitle>
                                  <DialogDescription>
                                    {selectedInvoice.service}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Patient</span>
                                    <span className="font-medium">{selectedInvoice.patient}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Amount</span>
                                    <span className="font-bold text-lg">{formatCurrency(selectedInvoice.amount)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Date</span>
                                    <span>{selectedInvoice.date}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-text-secondary">Due Date</span>
                                    <span>{selectedInvoice.dueDate}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-text-secondary">Status</span>
                                    <Badge variant={statusStyles[selectedInvoice.status]}>
                                      {selectedInvoice.status}
                                    </Badge>
                                  </div>
                                </div>
                                <DialogFooter className="mt-4">
                                  <Button variant="outline" className="w-full">
                                    <DollarSign className="size-4" />
                                    Record Payment
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            )}
                          </Dialog>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
