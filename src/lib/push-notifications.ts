import webpush, { PushSubscription, SendResult } from "web-push";

// ─── VAPID Key Management ───────────────────────────────────────

/** Get or derive the VAPID public key from env, falling back to a built-in dev key. */
export function getVapidPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BIGxpDWB6_y1vSx-0Elw6Kd8p9xGq3SLin2VQXFCNoLYcDdMGx7aqKQNvUUs8xrAeDAM3l3NqTvwyrR0Dcf7sOs"
  );
}

function ensureVapidConfigured(): void {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || "mailto:notifications@lifeblossom.com";

  if (!privateKey) {
    console.warn("[Push Notifications] VAPID_PRIVATE_KEY not set — generating ephemeral keys.");
    const keys = webpush.generateVAPIDKeys();
    webpush.setVapidDetails(contact, keys.publicKey, keys.privateKey);
    console.warn("[Push Notifications] Ephemeral VAPID public key:", keys.publicKey);
    console.warn("[Push Notifications] Set VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local for production use.");
    return;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
}

// ─── Send ───────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  id?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<SendResult> {
  ensureVapidConfigured();
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

export async function sendPushNotifications(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<Array<{ success: boolean; error?: string }>> {
  ensureVapidConfigured();
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush
        .sendNotification(sub, JSON.stringify(payload))
        .then(() => ({ success: true as const }))
        .catch((err: any) => ({
          success: false as const,
          error: err.message || "Unknown error",
          subscription: sub,
        }))
    )
  );

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { success: false, error: r.reason?.message || "Unknown error" }
  );
}
