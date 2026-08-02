import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/staff/leave — { staff_id, on_leave_until } marks a staff member on leave
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{ staff_id: string; on_leave_until: string }>(req);
  if (!body.staff_id || !/^\d{4}-\d{2}-\d{2}$/.test(body.on_leave_until || "")) {
    throw new ValidationError("staff_id and a YYYY-MM-DD on_leave_until date are required");
  }

  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || !["super_admin", "admin", "accountant"].includes(caller.role)) {
    return err("Not authorized. Admin role required.", 403);
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("staff")
    .update({ on_leave_until: body.on_leave_until })
    .eq("id", body.staff_id)
    .eq("org_id", orgId)
    .select()
    .single();
  if (error) return err(error.message, 500);
  return ok(data);
});

// DELETE /api/staff/leave?staff_id=... — clears leave (returns to duty)
export const DELETE = withAuth(async (req, supabase, authUserId) => {
  const staffId = new URL(req.url).searchParams.get("staff_id");
  if (!staffId) throw new ValidationError("staff_id query param is required");

  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || !["super_admin", "admin", "accountant"].includes(caller.role)) {
    return err("Not authorized. Admin role required.", 403);
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("staff")
    .update({ on_leave_until: null })
    .eq("id", staffId)
    .eq("org_id", orgId)
    .select()
    .single();
  if (error) return err(error.message, 500);
  return ok(data);
});
