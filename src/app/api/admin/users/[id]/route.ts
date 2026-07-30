import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  // Verify caller is admin or super_admin
  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || (caller.role !== "super_admin" && caller.role !== "admin")) {
    return err("Not authorized", 403);
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return err("User not found", 404);
  if (data.org_id !== caller.org_id) return err("Cannot view users outside your org", 403);

  return ok(data);
});

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || (caller.role !== "super_admin" && caller.role !== "admin")) {
    return err("Not authorized", 403);
  }

  const { data: target } = await supabase
    .from("users")
    .select("id, role, org_id")
    .eq("id", id)
    .single();

  if (!target) return err("User not found", 404);
  if (target.org_id !== caller.org_id) return err("Cannot modify users outside your org", 403);
  if (target.role === "super_admin" && caller.role !== "super_admin") {
    return err("Only super_admin can modify another super_admin", 403);
  }

  const body = await parseBody<{
    first_name?: string;
    last_name?: string;
    phone?: string | null;
    role?: string;
    is_active?: boolean;
  }>(req);

  const updates: Record<string, any> = {};
  if (body.first_name !== undefined) updates.first_name = body.first_name;
  if (body.last_name !== undefined) updates.last_name = body.last_name;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.role !== undefined) updates.role = body.role;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) return err("No fields to update", 400);

  const { error } = await supabase.from("users").update(updates).eq("id", id);
  if (error) return err(error.message, 500);
  return ok({ updated: true });
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || (caller.role !== "super_admin" && caller.role !== "admin")) {
    return err("Not authorized", 403);
  }

  const { data: target } = await supabase
    .from("users")
    .select("id, role, org_id")
    .eq("id", id)
    .single();

  if (!target) return err("User not found", 404);
  if (target.org_id !== caller.org_id) return err("Cannot modify users outside your org", 403);
  if (target.role === "super_admin" && caller.role !== "super_admin") {
    return err("Only super_admin can deactivate another super_admin", 403);
  }

  // Soft delete — deactivate the user
  const { error } = await supabase.from("users").update({ is_active: false }).eq("id", id);
  if (error) return err(error.message, 500);
  return ok({ deleted: true });
});
