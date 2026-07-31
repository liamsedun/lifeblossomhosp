import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile from the public.users table.
 * Uses the SSR server client → session from cookies → anon key.
 * RLS policies restrict access to the current user's own record.
 *
 * Returns 401 if no valid session. Never uses the service role key.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // Query the public.users table filtered by the authenticated user's ID.
    // MUST filter by id — RLS is not guaranteed to scope to the current user,
    // and without it `.single()` returns the first row (a different user!).
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active, last_login_at, created_at, updated_at, organization:organizations(*)")
      .eq("id", authUser.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
