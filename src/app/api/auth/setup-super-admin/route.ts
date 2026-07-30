import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/setup-super-admin
 *
 * One-time bootstrap endpoint that creates the initial super admin user
 * in both Supabase Auth and the public.users table.
 *
 * The user is created with email_confirmed_at set so no verification is needed.
 * Safe to call multiple times — skips if the email already exists.
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    const email = "olalekan.edun@gmail.com";
    const password = "Obadina11@";
    const orgId = "a0000000-0000-0000-0000-000000000001";

    // Check if user already exists in auth
    const { data: existingAuth } = await supabase.auth.admin.listUsers();
    const alreadyAuth = existingAuth?.users?.find((u) => u.email === email);
    if (alreadyAuth) {
      // Check if public user record exists
      const { data: existingPublic } = await supabase
        .from("users")
        .select("id, role")
        .eq("email", email)
        .maybeSingle();

      if (existingPublic) {
        return NextResponse.json({
          success: true,
          message: "Super admin already exists",
          data: { id: existingPublic.id, role: existingPublic.role },
        });
      }

      // Auth user exists but no public record — create it
      const { error: insertError } = await supabase.from("users").insert({
        id: alreadyAuth.id,
        org_id: orgId,
        email,
        role: "super_admin",
        first_name: "Olalekan",
        last_name: "Edun",
        phone: null,
        password_hash: "",
      });
      if (insertError) throw insertError;

      return NextResponse.json({
        success: true,
        message: "Public user record created for existing auth user",
        data: { id: alreadyAuth.id, role: "super_admin" },
      });
    }

    // Create auth user with email confirmed
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "super_admin", first_name: "Olalekan", last_name: "Edun" },
    });

    if (createError) throw createError;
    if (!authData.user) throw new Error("Failed to create auth user");

    // Create public user record
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      org_id: orgId,
      email,
      role: "super_admin",
      first_name: "Olalekan",
      last_name: "Edun",
      phone: null,
      password_hash: "",
    });

    if (userError) throw userError;

    return NextResponse.json({
      success: true,
      message: "Super admin created successfully",
      data: { id: authData.user.id, role: "super_admin" },
    });
  } catch (e: any) {
    console.error("[Setup Super Admin]", e);
    return NextResponse.json(
      { success: false, error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
