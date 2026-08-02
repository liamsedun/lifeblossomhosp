import { NextRequest } from "next/server";
import { withAuth, ok, err, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

const WRITE_ROLES = ["doctor", "super_admin"];

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!user || !WRITE_ROLES.includes(user.role)) {
    return err("Forbidden: only doctors and the super admin can delete medical reports", 403);
  }
  const { id } = await context.params;
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const { error } = await svc.from("medical_reports").delete().eq("id", id).eq("org_id", orgId);
  if (error) return err(error.message, 500);
  return ok(null);
});
