import { NextRequest } from "next/server";
import {
  withAuth, ok, err, parseBody, ValidationError, resolveParam,
  resolvePatientId,
} from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import type { Dependant } from "@/lib/api-types";

const VALID_RELATIONSHIPS = ["child", "spouse", "parent", "sibling", "grandparent", "other"];
const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const VALID_GENOTYPES = ["AA", "AS", "SS", "AC", "SC", "CC"];

const STAFF_ROLES = ["doctor", "nurse", "admin", "accountant", "super_admin"];

type PatientRow = {
  id: string;
  org_id: string;
  user_id: string;
  patient_number: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  genotype: string | null;
  allergies: string | null;
  dependant_relationship: string | null;
  primary_account_id: string | null;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
};

function wrapDependant(p: PatientRow, familyCode: string): Dependant {
  const fullName = p.user
    ? `${p.user.first_name} ${p.user.last_name || ""}`.trim()
    : "Dependant";
  const needsAttention = Boolean(p.allergies && p.allergies.trim());
  return {
    id: p.id,
    primary_account_id: p.primary_account_id || "",
    patient_number: p.patient_number,
    family_code: familyCode,
    full_name: fullName,
    date_of_birth: p.date_of_birth,
    gender: p.gender,
    blood_group: p.blood_group,
    genotype: p.genotype,
    allergies: p.allergies,
    relationship: p.dependant_relationship,
    phone: p.user?.phone ?? null,
    avatar_url: p.user?.avatar_url ?? null,
    created_at: p.created_at,
    status: needsAttention ? "needs_attention" : "active",
    outstanding: 0,
    pending_invoices: 0,
  };
}

/**
 * Resolve the dependant + family code, verifying the caller may access it.
 * Returns { dependant, familyCode } or throws a ValidationError with a status hint.
 */
async function loadDependant(supabase: any, authUserId: string, dependantId: string) {
  const svc = createServiceClient();

  const { data: dependant } = await svc
    .from("patients")
    .select("*, user:users(id, first_name, last_name, phone, avatar_url)")
    .eq("id", dependantId)
    .maybeSingle();
  if (!dependant) throw Object.assign(new Error("Dependant not found"), { status: 404 });

  // Only rows that are actual dependants (linked to a primary account)
  if (!dependant.primary_account_id) {
    throw Object.assign(new Error("This patient is not a dependant"), { status: 404 });
  }

  // Access control
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (caller && STAFF_ROLES.includes(caller.role)) {
    // staff can access any dependant in the org
  } else {
    const myPatientId = await resolvePatientId(supabase, authUserId);
    if (!myPatientId || myPatientId !== dependant.primary_account_id) {
      throw Object.assign(new Error("You can only view dependants in your family account"), { status: 403 });
    }
  }

  const { data: primary } = await svc
    .from("patients")
    .select("patient_number")
    .eq("id", dependant.primary_account_id)
    .maybeSingle();

  return { dependant, familyCode: primary?.patient_number || dependant.patient_number };
}

// GET /api/dependants/:id
export const GET = withAuth(async (req, supabase, authUserId, ctx) => {
  const dependantId = await resolveParam(ctx.params.id);
  const { dependant, familyCode } = await loadDependant(supabase, authUserId, dependantId);

  // Outstanding bill summary (bills roll up to the primary account)
  const svc = createServiceClient();
  const { data: invoices } = await svc
    .from("invoices")
    .select("total_amount, paid_amount, status")
    .eq("patient_id", dependantId)
    .in("status", ["pending", "partially_paid"]);

  const outstanding = (invoices || []).reduce(
    (sum, inv) => sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0);
  const wrapped = wrapDependant(dependant, familyCode);
  wrapped.outstanding = outstanding;
  wrapped.pending_invoices = (invoices || []).length;
  if (wrapped.status === "active" && outstanding > 0) wrapped.status = "needs_attention";

  return ok(wrapped);
});

// PUT /api/dependants/:id — update biodata (owner or staff)
export const PUT = withAuth(async (req, supabase, authUserId, ctx) => {
  const dependantId = await resolveParam(ctx.params.id);
  const body = await parseBody<{
    full_name?: string;
    date_of_birth?: string;
    sex?: string;
    blood_group?: string;
    genotype?: string;
    allergies?: string;
    phone?: string;
    relationship?: string;
  }>(req);

  const { dependant, familyCode } = await loadDependant(supabase, authUserId, dependantId);

  if (body.full_name !== undefined && !body.full_name.trim()) {
    throw new ValidationError("Full name cannot be empty", { full_name: "Required" });
  }
  if (body.blood_group && !VALID_BLOOD_GROUPS.includes(body.blood_group)) {
    throw new ValidationError("Invalid blood group", { blood_group: "Invalid value" });
  }
  if (body.genotype && !VALID_GENOTYPES.includes(body.genotype)) {
    throw new ValidationError("Invalid genotype", { genotype: "Invalid value" });
  }
  if (body.relationship && !VALID_RELATIONSHIPS.includes(body.relationship)) {
    throw new ValidationError("Invalid relationship", { relationship: "Invalid value" });
  }

  const svc = createServiceClient();

  const patientPatch: Record<string, any> = {};
  if (body.date_of_birth !== undefined) patientPatch.date_of_birth = body.date_of_birth || null;
  if (body.sex !== undefined) patientPatch.gender = body.sex || null;
  if (body.blood_group !== undefined) patientPatch.blood_group = body.blood_group || null;
  if (body.genotype !== undefined) patientPatch.genotype = body.genotype || null;
  if (body.allergies !== undefined) patientPatch.allergies = body.allergies?.trim() || null;
  if (body.relationship !== undefined) patientPatch.dependant_relationship = body.relationship || null;
  if (Object.keys(patientPatch).length) {
    const { error: patchError } = await svc.from("patients").update(patientPatch).eq("id", dependantId);
    if (patchError) return err(patchError.message, 500);
  }

  const userPatch: Record<string, any> = {};
  if (body.full_name !== undefined) {
    const parts = body.full_name.trim().split(/\s+/);
    userPatch.first_name = parts[0];
    userPatch.last_name = parts.slice(1).join(" ") || "";
  }
  if (body.phone !== undefined) userPatch.phone = body.phone?.trim() || null;
  if (Object.keys(userPatch).length) {
    const { error: userError } = await svc.from("users").update(userPatch).eq("id", dependant.user_id);
    if (userError) return err(userError.message, 500);
  }

  // Re-fetch the updated row and return it
  const { data: updated } = await svc
    .from("patients")
    .select("*, user:users(id, first_name, last_name, phone, avatar_url)")
    .eq("id", dependantId)
    .single();
  return ok(wrapDependant(updated, familyCode));
});

// DELETE /api/dependants/:id — owner (or admin) removes the dependant.
// FK cascade removes their medical records, appointments, invoices & payments.
export const DELETE = withAuth(async (req, supabase, authUserId, ctx) => {
  const dependantId = await resolveParam(ctx.params.id);
  const { dependant } = await loadDependant(supabase, authUserId, dependantId);

  const svc = createServiceClient();
  const { error: deleteError } = await svc.from("patients").delete().eq("id", dependantId);
  if (deleteError) return err(deleteError.message, 500);

  // Remove the placeholder login row
  await svc.from("users").delete().eq("id", dependant.user_id);

  return ok({ success: true });
});
