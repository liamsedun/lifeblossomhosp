import { create } from "zustand";
import type { Patient } from "@/lib/api-types";

// ─── Types ──────────────────────────────────────────────────────

interface PatientFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface PatientState {
  patients: Patient[];
  currentPatient: Patient | null;
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  filters: PatientFilters;

  fetchPatients: (filters?: PatientFilters) => Promise<void>;
  fetchPatient: (id: string) => Promise<void>;
  createPatient: (data: Partial<Patient>) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<Patient>) => Promise<Patient>;
  deletePatient: (id: string) => Promise<void>;
  setCurrentPatient: (patient: Patient | null) => void;
  setFilters: (filters: PatientFilters) => void;
  reset: () => void;
}

const initialState = {
  patients: [],
  currentPatient: null,
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,
  filters: {} as PatientFilters,
};

// ─── Store ──────────────────────────────────────────────────────

export const usePatientStore = create<PatientState>()((set, get) => ({
  ...initialState,

  fetchPatients: async (filters) => {
    const merged = { ...get().filters, ...filters };
    set({ loading: true, error: null, filters: merged });

    try {
      const params = new URLSearchParams();
      if (merged.search) params.set("search", merged.search);
      params.set("page", String(merged.page || 1));
      params.set("page_size", String(merged.pageSize || 20));

      const res = await fetch(`/api/patients?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch patients");

      set({
        patients: json.data || [],
        total: json.meta?.total || 0,
        page: json.meta?.page || 1,
        pageSize: json.meta?.pageSize || 20,
      });
    } catch (err: any) {
      set({ error: err.message, patients: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchPatient: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/patients/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Patient not found");
      set({ currentPatient: json.data });
    } catch (err: any) {
      set({ error: err.message, currentPatient: null });
    } finally {
      set({ loading: false });
    }
  },

  createPatient: async (data) => {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to create patient");

    // Refresh list in background
    get().fetchPatients();
    return json.data;
  },

  updatePatient: async (id, data) => {
    const res = await fetch(`/api/patients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to update patient");

    set((s) => ({
      patients: s.patients.map((p) => (p.id === id ? json.data : p)),
      currentPatient: s.currentPatient?.id === id ? json.data : s.currentPatient,
    }));
    return json.data;
  },

  deletePatient: async (id) => {
    const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to delete patient");

    set((s) => ({
      patients: s.patients.filter((p) => p.id !== id),
      currentPatient: s.currentPatient?.id === id ? null : s.currentPatient,
    }));
  },

  setCurrentPatient: (patient) => set({ currentPatient: patient }),
  setFilters: (filters) => set({ filters, page: 1 }),
  reset: () => set({ ...initialState }),
}));
