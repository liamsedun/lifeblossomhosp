import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotifications, type PushPayload } from "@/lib/push-notifications";

/**
 * POST /api/notifications/send
 *
 * Admin-only. Sends a push notification to one or all users.
 * Body: { title, body?, url?, userId?, role? }
 *   - If userId provided: send to that user only
 *   - If role provided: send to all users with that role
 *   - If neither: send to all subscribed users
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const { data: sender } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!sender || sender.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const payload: PushPayload = {
      title: body.title,
      body: body.body,
      url: body.url || "/",
      tag: body.tag || "admin-broadcast",
      requireInteraction: body.requireInteraction ?? true,
    };

    // Build subscription query
    let query = supabase.from("push_subscriptions").select("subscription_json");

    if (body.userId) {
      query = query.eq("user_id", body.userId);
    } else if (body.role) {
      // Join users table to filter by role
      query = query.eq("users.role", body.role);
    }

    const { data: subscriptions, error: subError } = await query;
    if (subError) {
      return NextResponse.json({ success: false, error: subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No subscriptions found" });
    }

    const subs = subscriptions.map((s: any) => s.subscription_json);
    const results = await sendPushNotifications(subs, payload);

    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;

    return NextResponse.json({ success: true, sent, failed, total: results.length });
  } catch (e: any) {
    console.error("[Send Notification]", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
