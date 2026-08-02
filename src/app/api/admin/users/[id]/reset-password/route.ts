import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const POST = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  // Verify caller is super_admin or admin
  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || (caller.role !== "super_admin" && caller.role !== "admin")) {
    return err("Not authorized. Admin or super_admin role required.", 403);
  }

  // Look up target user
  const { data: target } = await supabase
    .from("users")
    .select("id, role, org_id, email")
    .eq("id", id)
    .single();

  if (!target) return err("User not found", 404);
  if (target.org_id !== caller.org_id) return err("Cannot modify users outside your org", 403);

  // Only super_admin can reset another super_admin's password
  if (target.role === "super_admin" && caller.role !== "super_admin") {
    return err("Only super_admin can reset another super_admin's password", 403);
  }

  const body = await parseBody<{ password: string; email?: string }>(req);

  if (!body.password || body.password.length < 6) {
    return err("Password must be at least 6 characters", 400);
  }

  const svc = createServiceClient();

  // Optional: set/replace the login email (dependant placeholders use fake emails).
  // When provided, persist it to the profile first so patient-id login and
  // profile lookups resolve consistently.
  const loginEmail = body.email?.trim().toLowerCase();
  if (loginEmail && loginEmail !== target.email) {
    const { error: emailError } = await svc.from("users").update({ email: loginEmail }).eq("id", target.id);
    if (emailError) return err(emailError.message, 500);
  }

  const updatePayload: Record<string, any> = { password: body.password };
  if (loginEmail) {
    // Keep the auth account's email in sync with the profile — otherwise the
    // email login would target a stale email on the auth side.
    updatePayload.email = loginEmail;
    updatePayload.email_confirm = true;
  }

  const { error: updateError } = await svc.auth.admin.updateUserById(
    target.id,
    updatePayload
  );

  if (updateError) {
    // No auth account exists yet (e.g. dependant placeholder users).
    // Provision a real Supabase Auth account with the SAME id via SQL.
    if (/user.*not found|not found|no user/i.test(updateError.message || "")) {
      const email = loginEmail || target.email;
      const { error: provisionError } = await svc.rpc("provision_dependant_login", {
        p_user_id: target.id,
        p_email: email,
        p_password: body.password,
      });
      if (provisionError) return err(provisionError.message, 500);
      return ok({ message: "Password set successfully" });
    }
    return err(updateError.message, 500);
  }

  return ok({ message: "Password reset successfully" });
});
