import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkLoginLockout, recordLoginFailure, logAuth } from "@/lib/audit";

/**
 * POST /api/auth/login
 *
 * Authenticates via Supabase Auth and returns the user profile.
 * Cookies are set automatically by the SSR client so subsequent
 * server-side requests carry the session.
 *
 * Accepts:
 *   { loginType: "email", email: string, password: string }
 *   { loginType: "phone", phone: string, password: string }
 *   { loginType: "patient_id", patientId: string, password: string }
 *
 * Security: failed attempts are recorded in security_events; after 5
 * failures for the same identifier + IP within 15 minutes the account is
 * temporarily locked (HTTP 429).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { loginType, password } = body;

    const identifier =
      loginType === "email" ? (body.email || "").toLowerCase()
      : loginType === "phone" ? (body.phone || "")
      : (body.patientId || "");

    if (!loginType || !password || !identifier) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
    }

    // Brute-force lockout: 5+ failures for this identifier+IP in 15 min
    if (await checkLoginLockout(req, identifier)) {
      await recordLoginFailure(req, identifier, "blocked by temporary lockout");
      return NextResponse.json(
        { success: false, error: "Too many failed login attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Use the SSR-compatible server client so session cookies are written
    const supabase = await createClient();

    const fail = async (message: string, status = 401) => {
      await recordLoginFailure(req, identifier, message);
      return NextResponse.json({ success: false, error: message }, { status });
    };

    if (loginType === "email") {
      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
      if (error) return await fail(error.message);
    } //
    else if (loginType === "phone") {
      const { error } = await supabase.auth.signInWithPassword({ phone: identifier, password });
      if (error) return await fail(error.message);
    } //
    else if (loginType === "patient_id") {
      // Patient ID login: resolve to email via service role, then authenticate
      const patientId: string | undefined = body.patientId;
      if (!patientId || !password) {
        return NextResponse.json({ success: false, error: "Patient ID and password required" }, { status: 400 });
      }

      const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      // 1. Look up the patient record to get user_id
      const patientRes = await fetch(
        `${baseUrl}/rest/v1/patients?select=user_id&patient_number=eq.${encodeURIComponent(patientId)}`,
        { headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` } }
      );
      const patients = await patientRes.json();
      if (!Array.isArray(patients) || patients.length === 0) {
        await recordLoginFailure(req, identifier, "patient id not found");
        return NextResponse.json({ success: false, error: "Patient ID not found" }, { status: 404 });
      }

      // 2. Get the user email from the linked auth user
      const userId = patients[0].user_id;
      const userRes = await fetch(
        `${baseUrl}/rest/v1/users?select=email&id=eq.${userId}`,
        { headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` } }
      );
      const users = await userRes.json();
      const email: string | undefined = Array.isArray(users) && users.length > 0 ? users[0].email : undefined;
      if (!email) {
        await recordLoginFailure(req, identifier, "no email on profile");
        return NextResponse.json({ success: false, error: "No email found for this patient" }, { status: 400 });
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return await fail(error.message);
    } //
    else {
      return NextResponse.json({ success: false, error: "Invalid login type" }, { status: 400 });
    }

    // Session is now in cookies. Fetch the full profile.
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication succeeded but no user found" }, { status: 500 });
    }

    // Query the public.users table through RLS.
    // MUST filter by id to guarantee we get the right row, not
    // just the first user in the org.
    const { data: profile } = await supabase
      .from("users")
      .select("id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active, last_login_at, created_at, updated_at, organization:organizations(*)")
      .eq("id", authUser.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found in public.users table. Visit /api/auth/setup-super-admin to re-create it." },
        { status: 404 },
      );
    }

    await logAuth(req, authUser.id, "login");

    return NextResponse.json({ success: true, data: { user: profile, session: true } });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
