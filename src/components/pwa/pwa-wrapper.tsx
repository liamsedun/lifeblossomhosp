"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/contexts/notification-context";

// Lazy-loaded so the install UI never ships in the initial bundle.
const InstallPrompt = dynamic(() => import("@/components/pwa/install-prompt"), {
  ssr: false,
  loading: () => null,
});

// ─── Service Worker Registration ────────────────────────────────

function ServiceWorkerRegister() {
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => setRegistered(true))
        .catch((err) => console.warn("[SW] Registration failed:", err));
    }
  }, []);

  return null;
}

// ─── Notification Permission Button ─────────────────────────────

function NotificationBell({ className }: { className?: string }) {
  const { supported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  if (!supported || permission === "unsupported") return null;

  const isGranted = permission === "granted";

  return (
    <button
      onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
      className={cn(
        "relative p-2 rounded-full transition-colors",
        isSubscribed
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "bg-muted text-text-secondary hover:bg-muted/80",
        className
      )}
      title={isSubscribed ? "Notifications on" : "Enable notifications"}
    >
      {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
    </button>
  );
}

// ─── Main Export ────────────────────────────────────────────────

export default function PwaWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <ServiceWorkerRegister />
      {children}
      <InstallPrompt />
    </>
  );
}

export { NotificationBell };
