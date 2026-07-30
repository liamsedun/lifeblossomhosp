// OAuth callback route — handles redirect after Google / magic link sign-in
// Expects ?code=... from Supabase Auth redirect
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/patient";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const authUser = data.user;

      // Check if user profile exists in public.users
      const svc = createServiceClient();
      const { data: existing } = await svc
        .from("users")
        .select("id")
        .eq("email", authUser.email!)
        .maybeSingle();

      if (!existing) {
        // First-time Google sign-in — create profile
        const meta = authUser.user_metadata || {};
        const fullName = (meta.full_name || meta.name || authUser.email?.split("@")[0] || "").split(" ");
        const firstName = fullName[0] || "User";
        const lastName = fullName.slice(1).join(" ") || authUser.email?.split("@")[0] || "";

        const { error: insErr } = await svc.from("users").insert({
          id: authUser.id,
          org_id: "a0000000-0000-0000-0000-000000000001",
          email: authUser.email,
          password_hash: "oauth",
          role: "patient",
          first_name: firstName,
          last_name: lastName,
          phone: authUser.phone || null,
        });
        if (!insErr) {
          // Create patient record
          const { data: count } = await svc
            .from("patients")
            .select("id", { count: "exact", head: true })
            .eq("org_id", "a0000000-0000-0000-0000-000000000001");
          const patientNumber = `PT-${String((count?.length || 0) + 1).padStart(4, "0")}`;
          await svc.from("patients").insert({
            org_id: "a0000000-0000-0000-0000-000000000001",
            user_id: authUser.id,
            patient_number: patientNumber,
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
