import { NextRequest } from "next/server";
import {
  withAuth, ok, paginated, err, parseBody, ValidationError,
  resolvePatientId, resolveOrgId,
} from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { storeDependantAvatar } from "@/lib/dependant-avatar";
import { getOrgSettings, generatePatientNumber } from "@/lib/org-settings";
import { logAudit, logView } from "@/lib/audit";
import type { Dependant } from "@/lib/api-types";

const MAX_DEPENDANTS = 5;

const VALID_RELATIONSHIPS = ["child", "spouse", "parent", "sibling", "grandparent", "other"];
const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const VALID_GENOTYPES = ["AA", "AS", "SS", "AC", "SC", "CC"];

type PatientRow = {
  id: string;
  org_id: string;
  patient_number: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  genotype: string | null;
  allergies: string | null;
  dependant_relationship: string | null;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
};

/** Shape a raw patients row into the Dependant API type. */
function wrapDependant(p: PatientRow, familyCode: string): Dependant {
  const fullName = p.user
    ? `${p.user.first_name} ${p.user.last_name || ""}`.trim()
    : "Dependant";
  const needsAttention = Boolean(p.allergies && p.allergies.trim()) || p.dependant_relationship === "needs_attention";
  return {
    id: p.id,
    primary_account_id: "",
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

/** Fetch pending-invoice totals for a set of dependant patient ids (bills roll up to the primary). */
async function attachInvoiceSummary(svc: any, dependants: Dependant[]): Promise<Dependant[]> {
  if (!dependants.length) return dependants;
  const ids = dependants.map((d) => d.id);
  const { data: invoices, error } = await svc
    .from("invoices")
    .select("patient_id, total_amount, paid_amount, status")
    .in("patient_id", ids)
    .in("status", ["pending", "partially_paid"]);
  if (error || !invoices) return dependants;

  const byPatient = new Map<string, { outstanding: number; count: number }>();
  for (const inv of invoices) {
    const entry = byPatient.get(inv.patient_id) || { outstanding: 0, count: 0 };
    entry.outstanding += (inv.total_amount || 0) - (inv.paid_amount || 0);
    entry.count += 1;
    byPatient.set(inv.patient_id, entry);
  }
  return dependants.map((d) => {
    const entry = byPatient.get(d.id);
    if (entry) {
      return {
        ...d,
        outstanding: entry.outstanding,
        pending_invoices: entry.count,
        status: (d.status === "needs_attention" || entry.outstanding > 0) ? "needs_attention" : "active",
      };
    }
    return d;
  });
}

// GET /api/dependants
//   Patient caller  → their own dependants (auto-scoped)
//   Staff / admin   → ?patient_id= (dependants of a given patient)
export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const svc = createServiceClient();

  // Determine who the family account holder is
  let familyPatientId: string | null = sp.get("patient_id") || null;
  if (!familyPatientId) {
    const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
    if (caller?.role !== "patient") {
      return err("patient_id query parameter is required for staff", 400);
    }
    familyPatientId = await resolvePatientId(supabase, authUserId);
  }
  if (!familyPatientId) return err("Patient profile not found", 404);

  // The family account holder row (for family code display)
  const { data: primary } = await svc
    .from("patients")
    .select("id, patient_number, is_primary_account")
    .eq("id", familyPatientId)
    .maybeSingle();
  if (!primary) return err("Family account not found", 404);

  const { data: rows, error } = await svc
    .from("patients")
    .select("*, user:users(id, first_name, last_name, phone, avatar_url)")
    .eq("primary_account_id", familyPatientId)
    .order("created_at", { ascending: true });

  if (error) return err(error.message, 500);

  const dependants = (rows || []).map((r: any) => wrapDependant(r, primary.patient_number));
  const withBills = await attachInvoiceSummary(svc, dependants);

  await logView(req, authUserId, "dependants", familyPatientId, "Listed family dependants");

  return ok({
    family: { patient_id: primary.id, family_code: primary.patient_number },
    dependants: withBills,
    count: withBills.length,
    max: MAX_DEPENDANTS,
  });
});

// POST /api/dependants — create a dependant under the caller's family account
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    full_name?: string;
    date_of_birth?: string;
    sex?: string;
    blood_group?: string;
    genotype?: string;
    allergies?: string;
    phone?: string;
    relationship?: string;
    avatar?: string;
  }>(req);

  const fullName = (body.full_name || "").trim();
  if (!fullName) throw new ValidationError("Full name is required", { full_name: "Required" });
  if (!body.date_of_birth) throw new ValidationError("Date of birth is required", { date_of_birth: "Required" });
  if (!body.sex) throw new ValidationError("Sex is required", { sex: "Required" });
  if (body.blood_group && !VALID_BLOOD_GROUPS.includes(body.blood_group)) {
    throw new ValidationError("Invalid blood group", { blood_group: `Must be one of ${VALID_BLOOD_GROUPS.join(", ")}` });
  }
  if (body.genotype && !VALID_GENOTYPES.includes(body.genotype)) {
    throw new ValidationError("Invalid genotype", { genotype: `Must be one of ${VALID_GENOTYPES.join(", ")}` });
  }
  if (body.relationship && !VALID_RELATIONSHIPS.includes(body.relationship)) {
    throw new ValidationError("Invalid relationship", { relationship: `Must be one of ${VALID_RELATIONSHIPS.join(", ")}` });
  }

  const svc = createServiceClient();

  // Resolve the caller's family account (their patients row)
  const familyPatientId = await resolvePatientId(supabase, authUserId);
  if (!familyPatientId) return err("Only patients can add dependants", 403);

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const { data: primary } = await svc
    .from("patients")
    .select("id, patient_number, is_primary_account, primary_account_id")
    .eq("id", familyPatientId)
    .maybeSingle();
  if (!primary) return err("Family account not found", 404);

  // Only a main account holder can add dependants — dependants cannot
  // create further dependants under themselves
  if (primary.primary_account_id) {
    return err("Only the main account holder can add dependants", 403);
  }

  // Business rule: max 5 dependants per family unit
  const { count: dependantCount } = await svc
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("primary_account_id", familyPatientId);
  if ((dependantCount || 0) >= MAX_DEPENDANTS) {
    return err(`Maximum of ${MAX_DEPENDANTS} dependants per family account`, 400);
  }

  // Ensure the caller is flagged as a primary account
  if (!primary.is_primary_account) {
    await svc.from("patients").update({ is_primary_account: true }).eq("id", familyPatientId);
  }

  // Placeholder users row — dependants never log in (access flows via the primary)
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || "";
  const placeholderEmail = `dependant-${crypto.randomUUID().slice(0, 8)}@family.local`;

  const { data: placeholder, error: userError } = await svc
    .from("users")
    .insert({
      org_id: orgId,
      email: placeholderEmail,
      password_hash: "",
      role: "patient",
      first_name: firstName,
      last_name: lastName,
      phone: body.phone?.trim() || null,
      is_active: true,
    })
    .select("id")
    .single();
  if (userError) return err(userError.message, 500);

  // Unique patient number (per org) using the configured dependant prefix (default DEP-)
  const settings = await getOrgSettings(svc, orgId);
  const patientNumber = await generatePatientNumber(svc, orgId, settings.dependantPrefix);

  const { data: created, error: patientError } = await svc
    .from("patients")
    .insert({
      org_id: orgId,
      user_id: placeholder.id,
      patient_number: patientNumber,
      date_of_birth: body.date_of_birth,
      gender: body.sex,
      blood_group: body.blood_group || null,
      genotype: body.genotype || null,
      allergies: body.allergies?.trim() || null,
      dependant_relationship: body.relationship || null,
      is_primary_account: false,
      primary_account_id: familyPatientId,
    })
    .select("*, user:users(id, first_name, last_name, phone, avatar_url)")
    .single();

  if (patientError) {
    await svc.from("users").delete().eq("id", placeholder.id);
    return err(patientError.message, 500);
  }

  // Optional photo → save file and attach it to the dependant's placeholder user
  if (body.avatar) {
    const avatarUrl = await storeDependantAvatar(body.avatar, `dep-${created.id}`);
    const { error: avatarError } = await svc.from("users").update({ avatar_url: avatarUrl }).eq("id", placeholder.id);
    if (avatarError) return err(avatarError.message, 500);
    const { data: final } = await svc
      .from("patients")
      .select("*, user:users(id, first_name, last_name, phone, avatar_url)")
      .eq("id", created.id)
      .single();
    await logAudit(req, authUserId, { action: "create", entityType: "dependants", entityId: created.id, description: `Dependant "${fullName}" added` });
    return ok(wrapDependant(final as PatientRow, primary.patient_number), 201);
  }

  await logAudit(req, authUserId, { action: "create", entityType: "dependants", entityId: created.id, description: `Dependant "${fullName}" added` });
  return ok(wrapDependant(created as PatientRow, primary.patient_number), 201);
});
