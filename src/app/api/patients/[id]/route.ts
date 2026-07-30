import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, resolvePatientId } from "@/lib/api-utils";

// GET /api/patients/:id — patient can only see own record
export const GET = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  // If caller is a patient, only allow access to their own record
  const myId = await resolvePatientId(supabase, authUserId);
  if (myId && myId !== id) return err("Not found", 404);

  const { data, error } = await supabase
    .from("patients")
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)")
    .eq("id", id)
    .single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

// PUT /api/patients/:id — patient can only update own record
export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const myId = await resolvePatientId(supabase, authUserId);
  if (myId && myId !== id) return err("Not found", 404);

  const body = await parseBody<any>(req);
  const { data: existing } = await supabase.from("patients").select("id, user_id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const userFields: Record<string, any> = {};
  for (const k of ["first_name", "last_name", "phone"] as const)
    if (body[k] !== undefined) userFields[k] = body[k];
  if (Object.keys(userFields).length) {
    const { error: ue } = await supabase.from("users").update(userFields).eq("id", existing.user_id);
    if (ue) return err(ue.message, 500);
  }

  const patientFields: Record<string, any> = {};
  for (const k of ["date_of_birth", "gender", "blood_group", "genotype", "height_cm", "weight_kg",
    "allergies", "chronic_conditions", "address", "city", "state",
    "emergency_contact_name", "emergency_contact_phone", "emergency_contact_rel"] as const)
    if (body[k] !== undefined && body[k] !== "") patientFields[k] = body[k];

  const { data, error } = await supabase.from("patients").update(patientFields).eq("id", id)
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)").single();
  if (error) return err(error.message, 500);
  return ok(data);
});

// DELETE /api/patients/:id — soft-delete (admin only by middleware + authUserId check)
export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const { data: p } = await supabase.from("patients").select("id, user_id").eq("id", id).single();
  if (!p) return err("Not found", 404);
  const { error } = await supabase.from("users").update({ is_active: false }).eq("id", p.user_id);
  if (error) return err(error.message, 500);
  return ok(null);
});
