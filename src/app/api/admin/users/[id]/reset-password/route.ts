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

  const body = await parseBody<{ password: string }>(req);

  if (!body.password || body.password.length < 6) {
    return err("Password must be at least 6 characters", 400);
  }

  const serviceClient = createServiceClient();
  const { error: updateError } = await serviceClient.auth.admin.updateUserById(
    target.id,
    { password: body.password }
  );

  if (updateError) return err(updateError.message, 500);
  return ok({ message: "Password reset successfully" });
});
