"use client";

import { useState, useEffect, useCallback } from "react";
import type { Patient, ApiResponse } from "@/lib/api-types";

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

// --- Patients ---

export function usePatients(filters?: { search?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  const qs = params.toString();
  return useFetch<Patient[]>(`/api/patients${qs ? `?${qs}` : ""}`);
}

export function usePatient(id: string | null) {
  return useFetch<Patient>(id ? `/api/patients/${id}` : null);
}

export function useCreatePatient() {
  return useMutation<Partial<Patient>, Patient>("/api/patients", "POST");
}

export function useUpdatePatient() {
  return useMutation<Partial<Patient> & { id: string }, Patient>("/api/patients", "PUT");
}
