"use client";

import { useState, useEffect, useCallback } from "react";
import type { Notification, ApiResponse } from "@/lib/api-types";

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

// --- Notifications ---

export function useNotifications(filters?: { unread_only?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.unread_only) params.set("unread_only", "true");
  const qs = params.toString();
  return useFetch<Notification[]>(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export function useMarkAsRead() {
  const [loading, setLoading] = useState(false);

  const markAsRead = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
      const json: ApiResponse<void> = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to mark as read");
    } finally {
      setLoading(false);
    }
  }, []);

  return { markAsRead, loading };
}
