import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_ROLES = ["doctor", "nurse"];

async function checkRole(supabase: any, authUserId: string): Promise<boolean> {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  return !!(user && ALLOWED_ROLES.includes(user.role));
}

export const GET = withAuth(async (req, supabase, authUserId, context) => {
  if (!await checkRole(supabase, authUserId)) return err("Forbidden", 403);
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("doctor_notes")
    .select("*, doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .eq("id", id)
    .single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  if (!await checkRole(supabase, authUserId)) return err("Forbidden", 403);
  const { id } = await context.params;
  const body = await parseBody<any>(req);
  const svc = createServiceClient();

  const allowed = [
    "doctor_id", "appointment_id", "visit_date", "vitals", "tests_procedures",
    "clinical_findings", "diagnosis", "medications", "treatment_recommendations",
    "next_visit_date", "next_visit_reason", "is_confidential",
  ];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  const { data, error } = await svc
    .from("doctor_notes")
    .update(updates)
    .eq("id", id)
    .select("*, doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();

  if (error) return err(error.message, 500);
  if (!data) return err("Not found", 404);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  if (!await checkRole(supabase, authUserId)) return err("Forbidden", 403);
  const { id } = await context.params;
  const svc = createServiceClient();
  const { error } = await svc.from("doctor_notes").delete().eq("id", id);
  if (error) return err(error.message, 500);
  return ok(null);
});
