import { create } from "zustand";
import type { Appointment } from "@/lib/api-types";

// ─── Types ──────────────────────────────────────────────────────

interface AppointmentFilters {
  status?: string;
  patient_id?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}

interface AppointmentState {
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  currentAppointment: Appointment | null;
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  filters: AppointmentFilters;

  fetchAppointments: (filters?: AppointmentFilters) => Promise<void>;
  fetchAppointment: (id: string) => Promise<void>;
  createAppointment: (data: Partial<Appointment>) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<Appointment>;
  cancelAppointment: (id: string, reason?: string) => Promise<void>;
  setCurrentAppointment: (appointment: Appointment | null) => void;
  setFilters: (filters: AppointmentFilters) => void;
  reset: () => void;
}

const initialState = {
  appointments: [],
  upcomingAppointments: [],
  currentAppointment: null,
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,
  filters: {} as AppointmentFilters,
};

// ─── Helpers ────────────────────────────────────────────────────

function isUpcoming(a: Appointment): boolean {
  return ["scheduled", "confirmed", "in_progress"].includes(a.status);
}

// ─── Store ──────────────────────────────────────────────────────

export const useAppointmentStore = create<AppointmentState>()((set, get) => ({
  ...initialState,

  fetchAppointments: async (filters) => {
    const merged = { ...get().filters, ...filters };
    set({ loading: true, error: null, filters: merged });

    try {
      const params = new URLSearchParams();
      if (merged.status) params.set("status", merged.status);
      if (merged.patient_id) params.set("patient_id", merged.patient_id);
      if (merged.date) params.set("date", merged.date);
      params.set("page", String(merged.page || 1));
      params.set("page_size", String(merged.pageSize || 20));

      const res = await fetch(`/api/appointments?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch appointments");

      const appointments = json.data || [];
      set({
        appointments,
        upcomingAppointments: appointments.filter(isUpcoming),
        total: json.meta?.total || 0,
        page: json.meta?.page || 1,
        pageSize: json.meta?.pageSize || 20,
      });
    } catch (err: any) {
      set({ error: err.message, appointments: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchAppointment: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/appointments/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Appointment not found");
      set({ currentAppointment: json.data });
    } catch (err: any) {
      set({ error: err.message, currentAppointment: null });
    } finally {
      set({ loading: false });
    }
  },

  createAppointment: async (data) => {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to create appointment");

    // Refresh list
    get().fetchAppointments();
    return json.data;
  },

  updateAppointment: async (id, data) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to update appointment");

    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? json.data : a)),
      upcomingAppointments: s.upcomingAppointments.map((a) =>
        a.id === id ? json.data : a
      ),
      currentAppointment: s.currentAppointment?.id === id ? json.data : s.currentAppointment,
    }));
    return json.data;
  },

  cancelAppointment: async (id, reason) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancellation_reason: reason || null }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to cancel appointment");

    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? json.data : a)),
      upcomingAppointments: s.upcomingAppointments.filter((a) => a.id !== id),
      currentAppointment: s.currentAppointment?.id === id ? json.data : s.currentAppointment,
    }));
  },

  setCurrentAppointment: (appointment) => set({ currentAppointment: appointment }),
  setFilters: (filters) => set({ filters, page: 1 }),
  reset: () => set({ ...initialState }),
}));

// ─── Selectors ──────────────────────────────────────────────────

export const selectTodayAppointments = (state: AppointmentState) => {
  const today = new Date().toISOString().split("T")[0];
  return state.appointments.filter((a) => a.appointment_date?.startsWith(today));
};

export const selectAppointmentsByStatus = (status: string) => (state: AppointmentState) =>
  state.appointments.filter((a) => a.status === status);
