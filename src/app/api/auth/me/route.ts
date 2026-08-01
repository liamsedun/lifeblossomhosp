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

    // For patients, attach the family/account info so the frontend can hide
    // payment actions for dependants (main account holder pays on their behalf).
    let patient: { id: string; patient_number: string; is_primary_account: boolean; primary_account_id: string | null; is_dependant: boolean } | null = null;
    if (profile.role === "patient") {
      const { data: patientRow, error: patientError } = await supabase
        .from("patients")
        .select("id, patient_number, is_primary_account, primary_account_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (!patientError && patientRow) {
        patient = {
          id: patientRow.id,
          patient_number: patientRow.patient_number,
          is_primary_account: Boolean(patientRow.is_primary_account),
          primary_account_id: patientRow.primary_account_id || null,
          is_dependant: Boolean(patientRow.primary_account_id),
        };
      }
    }

    return NextResponse.json({ success: true, data: { ...profile, patient } });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
