"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-logout on inactivity (session security).
 *
 * After `timeoutMs` (default 15 minutes) of no user activity (mouse, keys,
 * touch, scroll), the session is ended server-side via /api/auth/logout
 * (which also writes a logout audit entry) and the user is redirected.
 *
 * Renders nothing.
 */
export default function IdleLogout({ timeoutMs = 15 * 60_000 }: { timeoutMs?: number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signedOut = useRef(false);

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        if (signedOut.current) return;
        signedOut.current = true;
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch { /* ignore */ }
        window.location.href = "/login";
      }, timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = [
      "pointermove", "pointerdown", "keydown", "click", "scroll", "touchstart",
    ];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [timeoutMs]);

  return null;
}
