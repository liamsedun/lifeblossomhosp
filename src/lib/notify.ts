import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushNotifications, type PushPayload } from "@/lib/push-notifications";

export interface NotifyInput {
  orgId: string;
  userIds: string[];
  type: string;
  title: string;
  message?: string;
  referenceType?: string;
  referenceId?: string;
  url?: string;
  tag?: string;
}

/**
 * Insert an in-app notification row per recipient + fire a best-effort web push.
 * Used for payment declarations (→ staff) and payment confirmations (→ patient + staff).
 */
export async function notifyUsers(svc: SupabaseClient, n: NotifyInput) {
  if (!n.userIds.length) return;
  for (const userId of n.userIds) {
    const { error } = await svc.from("notifications").insert({
      org_id: n.orgId,
      user_id: userId,
      type: n.type,
      title: n.title,
      message: n.message ?? null,
      reference_type: n.referenceType ?? null,
      reference_id: n.referenceId ?? null,
    });
    if (error) console.error("[Notify] insert error:", error.message);
  }

  try {
    const { data: subs } = await svc
      .from("push_subscriptions")
      .select("user_id, subscription_json")
      .in("user_id", n.userIds);
    if (subs && subs.length > 0) {
      const payload: PushPayload = {
        title: n.title,
        body: n.message,
        url: n.url,
        tag: n.tag,
        requireInteraction: false,
      };
      await sendPushNotifications(subs.map((s: any) => s.subscription_json), payload);
    }
  } catch (e) {
    console.error("[Notify] web push error:", e);
  }
}
