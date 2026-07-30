"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";

interface NotificationContextValue {
  /** Whether push notifications are supported by this browser */
  supported: boolean;
  /** Current permission state */
  permission: NotificationPermission | "unsupported" | "loading";
  /** Subscribe to push notifications (triggers browser prompt) */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<void>;
  /** Whether the user is currently subscribed */
  isSubscribed: boolean;
}

const NotificationContext = createContext<NotificationContextValue>({
  supported: false,
  permission: "loading",
  subscribe: async () => false,
  unsubscribe: async () => {},
  isSubscribed: false,
});

export function usePushNotifications() {
  return useContext(NotificationContext);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);

  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  // On mount: read permission state & check existing subscription
  useEffect(() => {
    if (!supported) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then((reg) => {
      setSwReg(reg);
      return reg.pushManager.getSubscription();
    }).then((sub) => {
      setIsSubscribed(!!sub);
    }).catch(() => {
      // Service worker may not be registered yet
    });
  }, [supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !swReg || !user) return false;

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      // Get VAPID public key
      const keyRes = await fetch("/api/notifications/vapid-public-key");
      const keyData = await keyRes.json();
      if (!keyData.success) throw new Error("Failed to get VAPID key");

      // Create push subscription
      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as unknown as BufferSource,
      });

      // Store on server
      const subJson = subscription.toJSON();
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subJson,
          device_name: navigator.platform || "Unknown",
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to store subscription");

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("[Push Subscribe]", err);
      return false;
    }
  }, [supported, swReg, user]);

  const unsubscribe = useCallback(async () => {
    if (!swReg || !supported) return;

    try {
      const subscription = await swReg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;

        // Unsubscribe from Push API
        await subscription.unsubscribe();

        // Notify server
        await fetch(`/api/notifications/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
          method: "DELETE",
        });
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("[Push Unsubscribe]", err);
    }
  }, [swReg, supported]);

  return (
    <NotificationContext.Provider value={{ supported, permission, subscribe, unsubscribe, isSubscribed }}>
      {children}
    </NotificationContext.Provider>
  );
}
