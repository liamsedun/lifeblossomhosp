"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Loader2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import type { Patient } from "@/lib/api-types";

// ─── Types ──────────────────────────────────────────────────────

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  category: "consultation" | "drug" | "lab" | "imaging" | "ward" | "procedure" | "other";
}

const ITEM_CATEGORIES = [
  { value: "consultation", label: "Consultation" },
  { value: "drug", label: "Drug / Medication" },
  { value: "lab", label: "Lab Test" },
  { value: "imaging", label: "Imaging / Radiology" },
  { value: "ward", label: "Ward / Accommodation" },
  { value: "procedure", label: "Procedure / Surgery" },
  { value: "other", label: "Other" },
] as const;

// ─── Props ──────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export default function CreateInvoiceModal({ open, onClose, onSuccess }: Props) {
  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, category: "consultation" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const recordPayment = usePaymentStore((s) => s.recordPayment);

  // ── Patient search ────────────────────────────────────────────

  const searchPatients = async (q: string) => {
    setPatientQuery(q);
    if (q.length < 2) { setPatients([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(q)}&page_size=10`);
      const json = await res.json();
      setPatients(json.data || []);
    } catch { setPatients([]); }
    finally { setSearching(false); }
  };

  const patientDisplay = (p: Patient) =>
    p.user ? `${p.user.first_name} ${p.user.last_name} (${p.patient_number})` : p.id;

  // ── Line items ────────────────────────────────────────────────

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, category: "other" }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);
  const taxAmount = useMemo(() => subtotal * (taxPercent / 100), [subtotal, taxPercent]);
  const total = subtotal + taxAmount - discountAmount;
  const today = new Date().toISOString().split("T")[0];

  // ── Preset items ──────────────────────────────────────────────

  const addPreset = (category: LineItem["category"], description: string, unit_price: number) => {
    setItems([...items, { id: crypto.randomUUID(), description, quantity: 1, unit_price, category }]);
  };

  // ── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedPatient) return;
    if (items.length === 0 || items.some((i) => !i.description.trim())) return;

    setSubmitting(true);
    try {
      const lineItems = items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }));

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          due_date: dueDate || undefined,
          notes: notes || undefined,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: total,
          items: lineItems,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create invoice");

      onSuccess();
      handleClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPatient(null);
    setPatientQuery("");
    setPatients([]);
    setDueDate("");
    setNotes("");
    setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, category: "consultation" }]);
    setTaxPercent(0);
    setDiscountAmount(0);
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Bill a patient for services rendered.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Patient selector */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Patient</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{patientDisplay(selectedPatient)}</p>
                  {selectedPatient.insurance_provider && (
                    <p className="text-xs text-text-secondary">{selectedPatient.insurance_provider} #{selectedPatient.insurance_number}</p>
                  )}
                </div>
                <button onClick={() => { setSelectedPatient(null); setPatientQuery(""); }} className="p-1 hover:bg-muted rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <Input
                  placeholder="Search patient by name or ID..."
                  className="pl-9"
                  value={patientQuery}
                  onChange={(e) => searchPatients(e.target.value)}
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                {patients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setPatients([]); setPatientQuery(""); }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                      >
                        <span className="font-medium">{p.user?.first_name} {p.user?.last_name}</span>
                        <span className="text-text-secondary ml-2 text-xs">{p.patient_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preset items quick-add */}
          {selectedPatient && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Quick Add Services</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { cat: "consultation" as const, label: "Consultation", price: 5000 },
                  { cat: "lab" as const, label: "Malaria Test", price: 3000 },
                  { cat: "lab" as const, label: "Blood Panel", price: 8000 },
                  { cat: "drug" as const, label: "Antimalarial", price: 4500 },
                  { cat: "imaging" as const, label: "Chest X-ray", price: 12000 },
                  { cat: "procedure" as const, label: "Suture", price: 15000 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => addPreset(p.cat, p.label, p.price)}
                    className="h-7 px-2.5 rounded-md bg-muted text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Line items */}
          {selectedPatient && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-secondary">Line Items</label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add Item
                </Button>
              </div>
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-[1fr_60px_90px_90px_32px] gap-2 px-1 text-[11px] font-medium text-text-secondary">
                  <span>Description</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit Price</span>
                  <span className="text-right">Total</span>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_60px_90px_90px_32px] gap-2 items-center">
                    <Input
                      placeholder="Item description"
                      className="h-8 text-xs"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    />
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-xs text-center"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8 text-xs text-right"
                      value={item.unit_price || ""}
                      placeholder="0.00"
                      onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                    <div className="h-8 flex items-center justify-end text-xs font-semibold text-foreground">
                      ₦{(item.quantity * item.unit_price).toLocaleString()}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 flex items-center justify-center text-text-secondary hover:text-danger transition-colors"
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          {selectedPatient && items.length > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Tax (%)</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="h-7 w-20 text-xs text-right"
                  value={taxPercent || ""}
                  placeholder="0"
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Tax Amount</span>
                  <span>₦{taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Discount (₦)</span>
                <Input
                  type="number"
                  min={0}
                  className="h-7 w-20 text-xs text-right"
                  value={discountAmount || ""}
                  placeholder="0"
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-1.5">
                <span>Total</span>
                <span>₦{total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Due date + notes */}
          {selectedPatient && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Due Date</label>
                <Input type="date" className="h-8 text-xs" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Notes (optional)</label>
                <Input placeholder="e.g. Follow-up required" className="h-8 text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedPatient || items.some((i) => !i.description.trim()) || total <= 0}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {submitting ? "Creating..." : `Create Invoice — ${formatCurrency(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
