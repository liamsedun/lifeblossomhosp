import { create } from "zustand";
import type { Invoice, Payment } from "@/lib/api-types";

// ─── Types ──────────────────────────────────────────────────────

interface PaymentFilters {
  status?: string;
  patient_id?: string;
  invoice_id?: string;
  page?: number;
  pageSize?: number;
}

interface PaymentTotals {
  totalRevenue: number;
  outstandingAmount: number;
  paidThisMonth: number;
  pendingInvoices: number;
}

interface PaymentState {
  invoices: Invoice[];
  payments: Payment[];
  currentInvoice: Invoice | null;
  currentPayment: Payment | null;
  totals: PaymentTotals;
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  error: string | null;
  filters: PaymentFilters;

  fetchInvoices: (filters?: PaymentFilters) => Promise<void>;
  fetchInvoice: (id: string) => Promise<void>;
  fetchPayments: (filters?: PaymentFilters) => Promise<void>;
  fetchPayment: (id: string) => Promise<void>;
  recordPayment: (data: {
    invoice_id: string;
    patient_id: string;
    amount: number;
    payment_method: string;
    transaction_ref?: string;
  }) => Promise<Payment>;
  initializePaystackPayment: (data: {
    invoice_id: string;
    patient_id: string;
    email: string;
    amount: number;
  }) => Promise<{ authorization_url: string; reference: string }>;
  computeTotals: () => void;
  setCurrentInvoice: (invoice: Invoice | null) => void;
  setCurrentPayment: (payment: Payment | null) => void;
  reset: () => void;
}

function computeTotals(invoices: Invoice[], payments: Payment[]): PaymentTotals {
  const paid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const outstanding = invoices
    .filter((i) => i.status === "pending" || i.status === "partially_paid")
    .reduce((sum, i) => sum + (i.total_amount - i.paid_amount), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const paidThisMonth = payments
    .filter((p) => p.status === "completed" && p.payment_date >= monthStart)
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingInvoices = invoices.filter(
    (i) => i.status === "pending" || i.status === "partially_paid"
  ).length;

  return { totalRevenue: paid, outstandingAmount: outstanding, paidThisMonth, pendingInvoices };
}

const initialState = {
  invoices: [],
  payments: [],
  currentInvoice: null as Invoice | null,
  currentPayment: null as Payment | null,
  totals: { totalRevenue: 0, outstandingAmount: 0, paidThisMonth: 0, pendingInvoices: 0 },
  page: 1,
  pageSize: 20,
  total: 0,
  loading: false,
  error: null,
  filters: {} as PaymentFilters,
};

// ─── Store ──────────────────────────────────────────────────────

export const usePaymentStore = create<PaymentState>()((set, get) => ({
  ...initialState,

  fetchInvoices: async (filters) => {
    const merged = { ...get().filters, ...filters };
    set({ loading: true, error: null, filters: merged });

    try {
      const params = new URLSearchParams();
      if (merged.patient_id) params.set("patient_id", merged.patient_id);
      if (merged.status) params.set("status", merged.status);
      params.set("page", String(merged.page || 1));
      params.set("page_size", String(merged.pageSize || 20));

      const res = await fetch(`/api/invoices?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch invoices");

      const invoices = json.data || [];
      set({
        invoices,
        total: json.meta?.total || 0,
        page: json.meta?.page || 1,
        pageSize: json.meta?.pageSize || 20,
        totals: computeTotals(invoices, get().payments),
      });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchInvoice: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Invoice not found");
      set({ currentInvoice: json.data });
    } catch (err: any) {
      set({ error: err.message, currentInvoice: null });
    } finally {
      set({ loading: false });
    }
  },

  fetchPayments: async (filters) => {
    const merged = { ...get().filters, ...filters };
    set({ loading: true, error: null, filters: merged });

    try {
      const params = new URLSearchParams();
      if (merged.invoice_id) params.set("invoice_id", merged.invoice_id);
      if (merged.patient_id) params.set("patient_id", merged.patient_id);
      params.set("page", String(merged.page || 1));
      params.set("page_size", String(merged.pageSize || 20));

      const res = await fetch(`/api/payments?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch payments");

      const payments = json.data || [];
      set({
        payments,
        total: json.meta?.total || 0,
        page: json.meta?.page || 1,
        pageSize: json.meta?.pageSize || 20,
        totals: computeTotals(get().invoices, payments),
      });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchPayment: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/payments/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Payment not found");
      set({ currentPayment: json.data });
    } catch (err: any) {
      set({ error: err.message, currentPayment: null });
    } finally {
      set({ loading: false });
    }
  },

  recordPayment: async (data) => {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to record payment");

    // Refresh both invoices and payments
    get().fetchInvoices();
    get().fetchPayments();
    return json.data;
  },

  initializePaystackPayment: async (data) => {
    const res = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to initialize payment");
    return json.data;
  },

  computeTotals: () => {
    const { invoices, payments } = get();
    set({ totals: computeTotals(invoices, payments) });
  },

  setCurrentInvoice: (invoice) => set({ currentInvoice: invoice }),
  setCurrentPayment: (payment) => set({ currentPayment: payment }),
  reset: () => set({ ...initialState }),
}));

// ─── Selectors ──────────────────────────────────────────────────

export const selectOverdueInvoices = (state: PaymentState) =>
  state.invoices.filter((i) => {
    if (i.status !== "pending") return false;
    if (!i.due_date) return false;
    return new Date(i.due_date) < new Date();
  });

export const selectInvoiceByStatus = (status: string) => (state: PaymentState) =>
  state.invoices.filter((i) => i.status === status);
