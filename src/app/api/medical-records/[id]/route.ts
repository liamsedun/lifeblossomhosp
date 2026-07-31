import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("medical_records")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase.from("medical_records").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["record_type", "title", "description", "diagnosis", "treatment", "notes", "is_confidential"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  const { data, error } = await svc.from("medical_records").update(updates).eq("id", id)
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();
  if (error) return err(error.message, 500);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data: existing } = await supabase.from("medical_records").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { error } = await svc.from("medical_records").delete().eq("id", id);
  if (error) return err(error.message, 500);
  return ok(null);
});
