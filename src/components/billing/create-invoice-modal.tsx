"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Loader2, Search, X, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import type { Patient } from "@/lib/api-types";

// ─── Types ──────────────────────────────────────────────────────

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_percent: number;
  category: "consultation" | "drug" | "lab" | "imaging" | "ward" | "procedure" | "other";
}

interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
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
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const [attendingStaff, setAttendingStaff] = useState<StaffUser[]>([]);
  const [selectedAttending, setSelectedAttending] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // New-patient quick form
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [npFirstName, setNpFirstName] = useState("");
  const [npLastName, setNpLastName] = useState("");
  const [npEmail, setNpEmail] = useState("");
  const [npPhone, setNpPhone] = useState("");
  const [npAddress, setNpAddress] = useState("");
  const [npCreating, setNpCreating] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Add first empty row on client mount to avoid hydration mismatch from crypto.randomUUID()
  useEffect(() => {
    if (items.length === 0) {
      setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, vat_percent: 7.5, category: "consultation" }]);
    }
  }, []);

  // Load all patients + attending staff when the dialog opens
  useEffect(() => {
    if (!open) return;
    setPatientsLoaded(false);
    fetch("/api/patients?page_size=1000")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAllPatients(json.data || []);
      })
      .catch(() => {})
      .finally(() => setPatientsLoaded(true));

    fetch("/api/staff?page_size=500")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const rows = (json.data || []).map((s: any) => ({
            id: s.user?.id || s.id,
            first_name: s.user?.first_name || "",
            last_name: s.user?.last_name || "",
            role: s.user?.role || "staff",
          }));
          setAttendingStaff(rows.filter((s: StaffUser) => ["doctor", "nurse", "admin", "super_admin", "accountant"].includes(s.role)));
        }
      })
      .catch(() => {});
  }, [open]);

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return allPatients;
    return allPatients.filter(
      (p) =>
        `${p.user?.first_name || ""} ${p.user?.last_name || ""}`.toLowerCase().includes(q) ||
        (p.patient_number || "").toLowerCase().includes(q) ||
        (p.user?.email || "").toLowerCase().includes(q)
    );
  }, [allPatients, patientQuery]);

  const patientDisplay = (p: Patient) =>
    p.user ? `${p.user.first_name} ${p.user.last_name} (${p.patient_number})` : p.id;

  // ── Line items ────────────────────────────────────────────────

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, vat_percent: 7.5, category: "other" }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);
  const taxAmount = useMemo(
    () => items.reduce((s, i) => s + ((i.quantity * i.unit_price) * (i.vat_percent || 0)) / 100, 0),
    [items]
  );
  const total = subtotal + taxAmount;

  // ── Preset items ──────────────────────────────────────────────

  const addPreset = (category: LineItem["category"], description: string, unit_price: number) => {
    setItems([...items, { id: crypto.randomUUID(), description, quantity: 1, unit_price, vat_percent: 7.5, category }]);
  };

  // ── Create new patient ────────────────────────────────────────

  const createPatient = async () => {
    if (!npFirstName.trim() || !npLastName.trim()) return;
    setNpCreating(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: npEmail.trim() || null,
          password: Math.random().toString(36).slice(2, 10) + "A1!",
          first_name: npFirstName.trim(),
          last_name: npLastName.trim(),
          phone: npPhone.trim() || null,
          address: npAddress.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create patient");

      const created: Patient = json.data;
      setAllPatients((prev) => [...prev, created]);
      setSelectedPatient(created);
      setShowNewPatient(false);
      setNpFirstName(""); setNpLastName(""); setNpEmail(""); setNpPhone(""); setNpAddress("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setNpCreating(false);
    }
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
        vat_percent: i.vat_percent || 0,
        vat_amount: ((i.quantity * i.unit_price) * (i.vat_percent || 0)) / 100,
        total_price: i.quantity * i.unit_price,
      }));

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          issue_date: issueDate || today,
          due_date: dueDate || undefined,
          notes: notes || undefined,
          attending_staff_id: selectedAttending || undefined,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: 0,
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
    setAllPatients([]);
    setPatientsLoaded(false);
    setSelectedAttending("");
    setIssueDate("");
    setDueDate("");
    setNotes("");
    setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, vat_percent: 7.5, category: "consultation" }]);
    setShowNewPatient(false);
    setSubmitting(false);
    onClose();
  };

  const inputClass = "h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Create Invoice</DialogTitle>
          <DialogDescription className="text-white/50">Medical Invoice / Billing — bill a patient for services rendered.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Patient selector */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Patient</label>
            {selectedPatient ? (
              <div className="p-2.5 bg-[#e0a84a]/10 border border-[#e0a84a]/30 rounded-lg space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{patientDisplay(selectedPatient)}</p>
                    {selectedPatient.user?.email && (
                      <p className="text-xs text-white/50">{selectedPatient.user.email}</p>
                    )}
                    {selectedPatient.user?.phone && (
                      <p className="text-xs text-white/50">{selectedPatient.user.phone}</p>
                    )}
                    {selectedPatient.address && (
                      <p className="text-xs text-white/50">{selectedPatient.address}{selectedPatient.city ? `, ${selectedPatient.city}` : ""}{selectedPatient.state ? `, ${selectedPatient.state}` : ""}</p>
                    )}
                  </div>
                  <button onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                    className="p-1 hover:bg-white/[0.06] rounded text-white/50 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder={patientsLoaded ? "Search patients by name, ID or email..." : "Loading patients..."}
                    className={"pl-9 " + inputClass}
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    disabled={!patientsLoaded}
                  />
                  {!patientsLoaded && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#e0a84a]" />
                  )}
                </div>
                {patientsLoaded && (
                  <div className="mt-1 rounded-xl border border-white/[0.06] bg-[#0d1322]/95 backdrop-blur-xl max-h-56 overflow-y-auto">
                    {filteredPatients.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-white/40">No patients found.</p>
                    ) : (
                      filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPatient(p); setPatientQuery(""); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0"
                        >
                          <span className="font-medium text-white">{p.user?.first_name} {p.user?.last_name}</span>
                          <span className="text-white/50 ml-2 text-xs">{p.patient_number}</span>
                          {p.user?.phone && (
                            <span className="text-white/40 ml-2 text-xs">{p.user.phone}</span>
                          )}
                        </button>
                      ))
                    )}
                    <button
                      onClick={() => setShowNewPatient(true)}
                      className="w-full text-left px-3 py-2.5 text-xs text-[#e0a84a] hover:bg-[#e0a84a]/10 transition-colors border-t border-white/[0.06] flex items-center gap-2"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Create New Patient
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New patient quick form */}
          {showNewPatient && (
            <div className="rounded-xl border border-[#e0a84a]/30 bg-[#e0a84a]/5 p-3 space-y-2.5">
              <p className="text-xs font-medium text-[#e0a84a]">Create New Patient</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First name *" className={inputClass} value={npFirstName} onChange={(e) => setNpFirstName(e.target.value)} />
                <Input placeholder="Last name *" className={inputClass} value={npLastName} onChange={(e) => setNpLastName(e.target.value)} />
                <Input placeholder="Email (optional)" type="email" className={inputClass} value={npEmail} onChange={(e) => setNpEmail(e.target.value)} />
                <Input placeholder="Phone (optional)" className={inputClass} value={npPhone} onChange={(e) => setNpPhone(e.target.value)} />
                <Input placeholder="Address (optional)" className={"col-span-2 " + inputClass} value={npAddress} onChange={(e) => setNpAddress(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewPatient(false)}
                  className="h-7 text-xs bg-white text-black border-border hover:bg-gray-100">
                  Cancel
                </Button>
                <Button size="sm" onClick={createPatient} disabled={npCreating || !npFirstName.trim() || !npLastName.trim()}
                  className="h-7 text-xs bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold">
                  {npCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                  Create & Select
                </Button>
              </div>
            </div>
          )}

          {/* Attending staff */}
          {selectedPatient && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Attending Doctor / Nurse / Admin</label>
              <select
                className={cn("w-full " + inputClass, "bg-[#0d1322] rounded-lg border px-3")}
                value={selectedAttending}
                onChange={(e) => setSelectedAttending(e.target.value)}
              >
                <option value="">Select attending staff...</option>
                {attendingStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    Dr/Nurse {s.first_name} {s.last_name} ({s.role.replace("_", " ")})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preset items quick-add */}
          {selectedPatient && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Quick Add Services</label>
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
                    className="h-7 px-2.5 rounded-md bg-white/[0.04] text-xs font-medium text-white/70 hover:bg-[#e0a84a]/10 hover:text-[#e0a84a] transition-colors whitespace-nowrap"
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
                <label className="text-xs font-medium text-white/50">Line Items</label>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-[#e0a84a] hover:text-[#e0a84a]/80 hover:bg-white/[0.06]"
                  onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add Row
                </Button>
              </div>
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-[1fr_60px_90px_70px_90px_32px] gap-2 px-1 text-[11px] font-medium text-white/40">
                  <span>Description</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">VAT%</span>
                  <span className="text-right">Total</span>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_60px_90px_70px_90px_32px] gap-2 items-center">
                    <Input
                      placeholder="Item description"
                      className={inputClass}
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    />
                    <Input
                      type="number"
                      min={1}
                      className={"h-8 text-xs text-center " + inputClass}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className={"h-8 text-xs text-right " + inputClass}
                      value={item.unit_price || ""}
                      placeholder="0.00"
                      onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      className={"h-8 text-xs text-right " + inputClass}
                      value={item.vat_percent || ""}
                      placeholder="7.5"
                      onChange={(e) => updateItem(item.id, "vat_percent", parseFloat(e.target.value) || 0)}
                    />
                    <div className="h-8 flex items-center justify-end text-xs font-semibold text-white">
                      ₦{(item.quantity * item.unit_price).toLocaleString()}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-red-400 transition-colors"
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
            <div className="border-t border-white/[0.06] pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Sub Total</span>
                <span className="text-white">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">VAT Amount</span>
                <span className="text-white">₦{taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-white/[0.06] pt-1.5">
                <span className="text-white">Total</span>
                <span className="text-white">₦{total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Dates + notes */}
          {selectedPatient && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Invoice Date</label>
                <Input type="date" className={"h-8 text-xs " + inputClass} max={today}
                  value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Due Date</label>
                <Input type="date" className={"h-8 text-xs " + inputClass}
                  value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedPatient && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Notes</label>
              <Textarea
                placeholder="Type notes here..."
                rows={3}
                className="border-white/[0.08] bg-white/[0.03] text-white/90 placeholder:text-white/30 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}
            className="bg-white text-black border-border hover:bg-gray-100">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedPatient || items.some((i) => !i.description.trim()) || total <= 0}
            className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {submitting ? "Creating..." : `Create Invoice — ${formatCurrency(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
