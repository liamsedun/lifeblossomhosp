"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, Loader2, TrendingUp, Wallet, Calendar, Download,
  PenLine, Trash2, Gift,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { useRoleGuard } from "@/hooks/use-role-guard";

type IncomeEntry = {
  id: string; org_id: string; description: string; category: string;
  amount: number; income_date: string; payment_method: string;
  source: string | null; notes: string | null;
  created_by: string | null; created_at: string;
  created_by_user?: { id: string; first_name: string; last_name: string } | null;
};

interface IncomeForm {
  description: string; category: string; amount: string; income_date: string;
  payment_method: string; source: string; notes: string;
}

const CATEGORIES = [
  { value: "donation", label: "Donations", icon: Gift, color: "text-purple-400 bg-purple-500/10" },
  { value: "food_sales", label: "Food Sales", color: "text-orange-400 bg-orange-500/10" },
  { value: "drink_sales", label: "Drink Sales", color: "text-cyan-400 bg-cyan-500/10" },
  { value: "drug_sales", label: "Drug Sales", color: "text-emerald-400 bg-emerald-500/10" },
  { value: "consumables", label: "Consumables", color: "text-amber-400 bg-amber-500/10" },
  { value: "other", label: "Other Income", color: "text-gray-400 bg-gray-500/10" },
];

const PAYMENT_METHODS = ["cash", "card", "transfer", "mobile_money"];

const emptyForm: IncomeForm = {
  description: "", category: "other", amount: "", income_date: new Date().toISOString().split("T")[0],
  payment_method: "cash", source: "", notes: "",
};

function GradientCard({ children, gradient, className }: { children: React.ReactNode; gradient: string; className?: string }) {
  return (
    <div className={cn("relative group", className)}>
      <div className={cn("absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30", gradient)} />
      <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 overflow-hidden">
        <div className={cn("absolute top-0 right-0 w-48 h-48 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10", gradient)} />
        {children}
      </div>
    </div>
  );
}

function escapeCsv(val: string | number): string {
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const bom = "\uFEFF";
  const csv = bom + rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function OtherIncomePage() {
  const { authorized } = useRoleGuard(["super_admin", "admin", "accountant"]);
  const [data, setData] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<IncomeEntry | null>(null);
  const [deleteItem, setDeleteItem] = useState<IncomeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IncomeForm>(emptyForm);

  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [y, mm] = m.split("-").map(Number);
      const from = `${y}-${String(mm).padStart(2, "0")}-01`;
      const to = new Date(y, mm, 0).toISOString().split("T")[0];
      const res = await fetch(`/api/other-income?from=${from}&to=${to}&page_size=100`);
      const json = await res.json();
      if (json.success) setData(json.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const filtered = useMemo(() => {
    let items = data;
    if (categoryFilter !== "All") items = items.filter((d) => d.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((d) =>
        d.description.toLowerCase().includes(q) ||
        (d.source || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [data, categoryFilter, search]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }, [month]);

  const totals = useMemo(() => {
    const entries = filtered.length;
    const total = filtered.reduce((s, d) => s + d.amount, 0);
    const byCategory: Record<string, number> = {};
    filtered.forEach((d) => { byCategory[d.category] = (byCategory[d.category] || 0) + d.amount; });
    return { total, avg: entries > 0 ? total / entries : 0, byCategory, entries };
  }, [filtered]);

  const summaryCards = [
    { label: "Total Other Income", value: formatCurrency(totals.total), icon: TrendingUp, gradient: "bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-300" },
    { label: "Avg per Entry", value: formatCurrency(totals.avg), icon: Calendar, gradient: "bg-gradient-to-br from-blue-500 via-indigo-400 to-violet-300" },
    { label: "Categories", value: String(Object.keys(totals.byCategory).length), icon: Wallet, gradient: "bg-gradient-to-br from-purple-500 via-pink-400 to-rose-300" },
    { label: "Total Entries", value: String(totals.entries), icon: Gift, gradient: "bg-gradient-to-br from-amber-500 via-orange-400 to-red-300" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = !!editItem;
      const url = isEdit ? `/api/other-income/${editItem!.id}` : "/api/other-income";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          category: form.category,
          amount: parseFloat(form.amount),
          income_date: form.income_date,
          payment_method: form.payment_method,
          source: form.source || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");
      setShowAdd(false); setEditItem(null); load(month);
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/other-income/${deleteItem.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      setDeleteItem(null); load(month);
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  const openEdit = (item: IncomeEntry) => {
    setEditItem(item);
    setForm({
      description: item.description,
      category: item.category,
      amount: String(item.amount),
      income_date: item.income_date,
      payment_method: item.payment_method || "cash",
      source: item.source || "",
      notes: item.notes || "",
    });
  };

  const exportCsv = () => {
    const rows: string[][] = [];
    rows.push(["Life Blossom Hospital — Other Income Report"]);
    rows.push(["Generated", new Date().toLocaleString()]);
    rows.push(["Period", monthLabel]);
    rows.push([""]);
    rows.push(["Total Income", formatCurrency(totals.total)]);
    rows.push(["Average per Entry", formatCurrency(totals.avg)]);
    rows.push(["Entries", String(totals.entries)]);
    rows.push([""]);
    rows.push(["Date", "Description", "Category", "Amount", "Payment Method", "Source", "Notes"]);
    filtered.forEach((d) => {
      rows.push([d.income_date, d.description, d.category, String(d.amount), d.payment_method, d.source || "", d.notes || ""]);
    });
    downloadCsv(`other-income-${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

  const inputClass = "h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20";

  if (!authorized) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Other Income</h1>
          <p className="text-sm text-white/50 mt-1">Donations, food/drink/drug sales, and consumables</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-[#e0a84a]/40"
              aria-label="Reporting period"
            />
          </div>
          <Button variant="outline" onClick={exportCsv}
            className="bg-white text-black border-border hover:bg-gray-100 h-9">
            <Download className="size-4 mr-1" />Export
          </Button>
          <Button onClick={() => { setEditItem(null); setForm({ ...emptyForm, income_date: new Date().toISOString().split("T")[0] }); setShowAdd(true); }}
            className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20 h-9">
            <Plus className="size-4" />Add Income
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <GradientCard key={card.label} gradient={card.gradient}>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm text-white/50">{card.label}</p>
                  <p className="text-xl font-bold text-white mt-1">{card.value}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{monthLabel}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-sm">
                  <Icon className="size-5 text-white/80" />
                </div>
              </div>
            </GradientCard>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <Input placeholder="Search by description or source..." className={"pl-9 " + inputClass}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white/80">
          <option value="All" className="bg-[#0d1322]">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-[#0d1322]">{c.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-[#e0a84a]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-white/40">
                  <th className="px-5 py-3.5 font-medium">Date</th>
                  <th className="px-5 py-3.5 font-medium">Description</th>
                  <th className="px-5 py-3.5 font-medium">Category</th>
                  <th className="px-5 py-3.5 font-medium">Amount</th>
                  <th className="px-5 py-3.5 font-medium">Payment</th>
                  <th className="px-5 py-3.5 font-medium">Source</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-white/40">No income entries found.</td></tr>
                ) : filtered.map((item) => {
                  const cat = CATEGORIES.find((c) => c.value === item.category);
                  return (
                    <tr key={item.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-white/60 text-xs">{item.income_date}</td>
                      <td className="px-5 py-3 font-medium text-white">{item.description}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={cn("text-[10px] border-0", cat?.color || "text-white/40")}>
                          {cat?.label || item.category}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-semibold text-emerald-400">{formatCurrency(item.amount)}</td>
                      <td className="px-5 py-3 text-white/50 capitalize text-xs">{item.payment_method}</td>
                      <td className="px-5 py-3 text-white/50 text-xs">{item.source || "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => openEdit(item)}
                            className="h-7 px-2 rounded-lg text-xs text-[#e0a84a]/70 hover:text-[#e0a84a] hover:bg-white/[0.06] transition-colors">
                            <PenLine className="size-3.5" />
                          </button>
                          <button onClick={() => setDeleteItem(item)}
                            className="h-7 px-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-white/[0.06] transition-colors">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAdd || !!editItem} onOpenChange={(o) => { if (!o && !saving) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editItem ? "Edit Income Entry" : "Add Other Income"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Description *</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required
                className={inputClass} placeholder="e.g. Sunday donation from Mr. Johnson" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Category *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="flex h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#0d1322]">{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Amount (₦) *</label>
                <Input type="number" min={0} step="0.01" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} required
                  className={inputClass} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Date *</label>
                <Input type="date" value={form.income_date}
                  onChange={(e) => setForm({ ...form, income_date: e.target.value })} required className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Payment Method</label>
                <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="flex h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white capitalize">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className="bg-[#0d1322]">{m.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Source / Donor (optional)</label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                className={inputClass} placeholder="e.g. Mr. Johnson, Pharmacy counter" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Notes (optional)</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass} placeholder="Any additional details" />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                {saving ? "Saving..." : editItem ? "Save Changes" : "Add Income"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}>
        <DialogContent className="sm:max-w-sm border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl text-white">
          <DialogHeader><DialogTitle className="text-white">Delete Income Entry</DialogTitle></DialogHeader>
          <p className="text-sm text-white/60">
            Delete <strong className="text-white">{deleteItem?.description}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleDelete} disabled={deleting}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 shadow-lg shadow-rose-500/20">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
