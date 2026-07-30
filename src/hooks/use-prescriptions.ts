"use client";

import { useState, useEffect, useCallback } from "react";
import type { Prescription, ApiResponse } from "@/lib/api-types";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useFetch<T>(url: string | null): FetchState<T> & { refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refresh = useCallback(() => setRefetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((json: ApiResponse<T>) => {
        if (cancelled) return;
        if (json.success) setData(json.data ?? null);
        else setError(json.error ?? "Unknown error");
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url, refetchKey]);

  return { data, loading, error, refresh };
}

function useMutation<TBody, TResponse>(url: string, method: "POST" | "PUT" = "POST") {
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (body: TBody): Promise<TResponse> => {
      setLoading(true);
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json: ApiResponse<TResponse> = await res.json();
        if (!json.success) throw new Error(json.error ?? "Request failed");
        return json.data as TResponse;
      } finally {
        setLoading(false);
      }
    },
    [url, method]
  );

  return { mutate, loading };
}

// --- Prescriptions ---

export function usePrescriptions(filters?: {
  patient_id?: string;
  doctor_id?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.patient_id) params.set("patient_id", filters.patient_id);
  if (filters?.doctor_id) params.set("doctor_id", filters.doctor_id);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return useFetch<Prescription[]>(`/api/prescriptions${qs ? `?${qs}` : ""}`);
}

export function usePrescription(id: string | null) {
  return useFetch<Prescription>(id ? `/api/prescriptions/${id}` : null);
}

export function useCreatePrescription() {
  return useMutation<Partial<Prescription>, Prescription>("/api/prescriptions", "POST");
}
