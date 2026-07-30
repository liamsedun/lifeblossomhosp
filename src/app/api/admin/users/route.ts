import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, authUserId) => {
  // Verify caller is super_admin or admin
  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || (caller.role !== "super_admin" && caller.role !== "admin")) {
    return err("Not authorized. Admin or super_admin role required.", 403);
  }

  const sp = new URL(req.url).searchParams;
  const role = sp.get("role");
  const search = sp.get("search");
  const active = sp.get("is_active");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .eq("org_id", caller.org_id);

  if (role) query = query.eq("role", role);
  if (active !== null) query = query.eq("is_active", active === "true");
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const PATCH = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase
    .from("users")
    .select("role, org_id")
    .eq("id", authUserId)
    .single();

  if (!caller || (caller.role !== "super_admin" && caller.role !== "admin")) {
    return err("Not authorized", 403);
  }

  const body = await parseBody<{
    user_id: string;
    role?: string;
    is_active?: boolean;
  }>(req);

  if (!body.user_id) return err("user_id is required", 400);

  // Ensure target user belongs to same org
  const { data: target } = await supabase
    .from("users")
    .select("id, role, org_id, email")
    .eq("id", body.user_id)
    .single();

  if (!target) return err("User not found", 404);
  if (target.org_id !== caller.org_id) return err("Cannot manage users outside your org", 403);

  // Only super_admin can modify another super_admin
  if (target.role === "super_admin" && caller.role !== "super_admin") {
    return err("Only super_admin can modify another super_admin", 403);
  }

  const updates: Record<string, any> = {};
  if (body.role !== undefined) updates.role = body.role;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) return err("No fields to update", 400);

  const { error } = await supabase.from("users").update(updates).eq("id", body.user_id);
  if (error) return err(error.message, 500);
  return ok({ updated: true });
});
