import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/notifications/subscribe
 *
 * Stores a push subscription for the authenticated user.
 * Body: { subscription: PushSubscriptionJSON, device_name?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const subscription = body.subscription;
    const deviceName = body.device_name || navigator?.platform || "Unknown";

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: "Invalid subscription" }, { status: 400 });
    }

    // Store in DB — upsert on endpoint (one subscription per device)
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription_json: subscription,
        device_name: deviceName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint", ignoreDuplicates: false }
    );

    if (error) {
      console.error("[Push Subscribe] DB error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[Push Subscribe]", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/subscribe?endpoint=xxx
 *
 * Removes a push subscription (e.g., when user unsubscribes or logs out).
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const endpoint = new URL(req.url).searchParams.get("endpoint");
    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Missing endpoint" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
