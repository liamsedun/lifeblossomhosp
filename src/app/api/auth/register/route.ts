import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getOrgSettings, generatePatientNumber } from "@/lib/org-settings";

/**
 * POST /api/auth/register
 *
 * Creates a new user in Supabase Auth and provisions their profile
 * in the public.users table (plus patients/staff record).
 *
 * The service role key is used for profile creation since the new
 * user's session is not yet established for RLS.
 *
 * Accepts:
 *   { email, password, first_name, last_name, phone?, role? }
 *   { phone, password, first_name, last_name, email?, role? }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, phone, password, first_name, last_name, role } = await req.json();

    if ((!email && !phone) || !password || !first_name || !last_name) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const targetRole = role || "patient";

    // Only patients may self-register. Doctors, nurses and staff accounts
    // must be created by super admins/admins/accountants from the admin portal.
    if (targetRole !== "patient") {
      return NextResponse.json(
        { success: false, error: "Only patient accounts can be created via registration. Staff accounts are created by hospital admins." },
        { status: 403 }
      );
    }

    // 1. Create auth user in Supabase Auth
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let authUserId: string;
    if (email) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      if (!data.user) return NextResponse.json({ success: false, error: "Failed to create auth user" }, { status: 500 });
      authUserId = data.user.id;
    } else {
      const { data, error } = await supabase.auth.signUp({ phone, password });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      if (!data.user) return NextResponse.json({ success: false, error: "Failed to create auth user" }, { status: 500 });
      authUserId = data.user.id;
    }

    // 2. Create profile in public.users (service role — no RLS bypass, just
    //    the only way to write during sign-up before session is established)
    const orgId = "a0000000-0000-0000-0000-000000000001";
    const svc = createServiceClient();

    const { data: profile, error: profileError } = await svc
      .from("users")
      .insert({
        id: authUserId,
        org_id: orgId,
        email: email || null,
        phone: phone || null,
        role: targetRole,
        first_name,
        last_name,
        password_hash: "", // managed by Supabase Auth
      })
      .select("id, org_id, email, role, first_name, last_name, phone, is_active, created_at, organization:organizations(*)")
      .single();

    if (profileError) {
      // Cleanup: try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    // 3. Create specialty record based on role
    if (targetRole === "patient") {
      const settings = await getOrgSettings(svc, orgId);
      const patientNumber = await generatePatientNumber(svc, orgId, settings.patientPrefix);

      const { error: ptError } = await svc.from("patients").insert({
        org_id: orgId,
        user_id: authUserId,
        patient_number: patientNumber,
      });

      if (ptError) {
        // Non-fatal: profile was created
        console.error("Failed to create patient record:", ptError);
      }
    } else {
      // Staff roles
      const { data: count } = await svc
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);

      const staffNumber = `STF-${String((count?.length || 0) + 1).padStart(4, "0")}`;

      const { error: stError } = await svc.from("staff").insert({
        org_id: orgId,
        user_id: authUserId,
        staff_number: staffNumber,
        department: targetRole === "doctor" ? "General" : targetRole === "nurse" ? "Nursing" : "Administration",
      });

      if (stError) {
        console.error("Failed to create staff record:", stError);
      }
    }

    return NextResponse.json({ success: true, data: profile }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
