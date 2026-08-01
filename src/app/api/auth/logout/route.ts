import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuth } from "@/lib/audit";

/**
 * POST /api/auth/logout
 *
 * Ends the Supabase session (clears cookies) and records a logout event
 * in the audit trail. Safe to call even when already signed out.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await logAuth(req, user.id, "logout");
    }

    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
