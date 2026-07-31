import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, resolvePatientId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

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
  const svc = createServiceClient();

  const myId = await resolvePatientId(supabase, authUserId);
  if (myId && myId !== id) return err("Not found", 404);

  const body = await parseBody<any>(req);
  const { data: existing } = await supabase.from("patients").select("id, user_id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const userFields: Record<string, any> = {};
  for (const k of ["first_name", "last_name", "phone"] as const)
    if (body[k] !== undefined) userFields[k] = body[k];
  if (Object.keys(userFields).length) {
    const { error: ue } = await svc.from("users").update(userFields).eq("id", existing.user_id);
    if (ue) return err(ue.message, 500);
  }

  const patientFields: Record<string, any> = {};
  for (const k of ["date_of_birth", "gender", "blood_group", "genotype", "height_cm", "weight_kg",
    "allergies", "chronic_conditions", "address", "city", "state",
    "emergency_contact_name", "emergency_contact_phone", "emergency_contact_rel"] as const)
    if (body[k] !== undefined && body[k] !== "") patientFields[k] = body[k];

  if (body.blood_group !== undefined && body.blood_group !== "") {
    const bg = String(body.blood_group).toUpperCase().trim();
    if (["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bg)) {
      patientFields.blood_group = bg;
    } else if (body.blood_group !== "") {
      return err("blood_group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-", 400);
    }
  }

  if (body.genotype !== undefined && body.genotype !== "") {
    const gt = String(body.genotype).toUpperCase().trim();
    if (["AA", "AS", "SS", "AC", "SC", "CC"].includes(gt)) {
      patientFields.genotype = gt;
    } else if (body.genotype !== "") {
      return err("genotype must be one of: AA, AS, SS, AC, SC, CC", 400);
    }
  }

  if (body.marital_status !== undefined && body.marital_status !== "") {
    const ms = String(body.marital_status).toLowerCase().trim();
    if (["single", "married", "divorced", "widowed"].includes(ms)) {
      patientFields.marital_status = ms;
    } else if (body.marital_status !== "") {
      return err("marital_status must be one of: single, married, divorced, widowed", 400);
    }
  }

  if (body.medical_plan !== undefined) {
    const plan = String(body.medical_plan).toLowerCase().trim();
    if (["individual", "family", "organisation", "hmo"].includes(plan)) {
      patientFields.medical_plan = plan;
    } else {
      return err("medical_plan must be one of: individual, family, organisation, hmo", 400);
    }
  }

  const { data, error } = await svc.from("patients").update(patientFields).eq("id", id)
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)").single();
  if (error) return err(error.message, 500);
  return ok(data);
});

// DELETE /api/patients/:id — soft-delete (admin only by middleware + authUserId check)
export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data: p } = await supabase.from("patients").select("id, user_id").eq("id", id).single();
  if (!p) return err("Not found", 404);
  const { error } = await svc.from("users").update({ is_active: false }).eq("id", p.user_id);
  if (error) return err(error.message, 500);
  return ok(null);
});
