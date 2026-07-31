import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  // If caller is a patient, return only public fields
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (caller?.role === "patient") {
    const { data, error } = await supabase
      .from("staff")
      .select("id, staff_number, specialization, department, is_available, user:users!inner(id, first_name, last_name)")
      .eq("id", id).single();
    if (error || !data) return err("Not found", 404);
    return ok(data);
  }

  const { data, error } = await supabase
    .from("staff")
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase.from("staff").select("id, user_id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const svc = createServiceClient();
  const userFields: Record<string, any> = {};
  for (const k of ["first_name", "last_name", "phone", "role"] as const)
    if (body[k] !== undefined) userFields[k] = body[k];
  if (Object.keys(userFields).length) {
    const { error: ue } = await svc.from("users").update(userFields).eq("id", existing.user_id);
    if (ue) return err(ue.message, 500);
  }

  const staffFields: Record<string, any> = {};
  for (const k of ["specialization", "license_number", "department", "qualification",
    "employment_type", "is_available", "years_of_exp", "available_from", "available_until"] as const)
    if (body[k] !== undefined && body[k] !== "") staffFields[k] = body[k];

  const { data, error } = await svc.from("staff").update(staffFields).eq("id", id)
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)").single();
  if (error) return err(error.message, 500);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data: s } = await supabase.from("staff").select("id, user_id").eq("id", id).single();
  if (!s) return err("Not found", 404);
  const { error } = await svc.from("users").update({ is_active: false }).eq("id", s.user_id);
  if (error) return err(error.message, 500);
  return ok(null);
});
