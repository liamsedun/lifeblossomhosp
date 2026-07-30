"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bell, BellOff, Download, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/contexts/notification-context";

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

// ─── Install Prompt ─────────────────────────────────────────────

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  // Also check if already installed (standalone mode)
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any)?.standalone === true) {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install Life Blossom</p>
          <p className="text-xs text-text-secondary">Add to your home screen for quick access.</p>
        </div>
        <button
          onClick={handleInstall}
          className="h-8 px-4 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark shrink-0"
        >
          Install
        </button>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      </div>
    </div>
  );
}

// ─── Notification Permission Button ─────────────────────────────

function NotificationBell() {
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
          : "bg-muted text-text-secondary hover:bg-muted/80"
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
