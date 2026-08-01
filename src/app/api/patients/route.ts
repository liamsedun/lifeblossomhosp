import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit, logView } from "@/lib/audit";

// GET /api/patients — list patients (patient sees only own, staff sees all in org)
export const GET = withAuth(async (req, supabase, authUserId) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const { page, pageSize, from, to } = getPagination(searchParams);

  // If caller is a patient, return only their own record
  const myPatientId = searchParams.get("patient_id") || await resolvePatientId(supabase, authUserId);
  if (myPatientId) {
    const { data, error } = await supabase
      .from("patients")
      .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)")
      .eq("id", myPatientId)
      .maybeSingle();

    if (error) return err(error.message, 500);
    if (data) await logView(req, authUserId, "patients", data.id, "Viewed own patient profile");
    return paginated(data ? [data] : [], data ? 1 : 0, page, pageSize);
  }

  let countQuery = supabase.from("patients").select("*", { count: "exact", head: true });
  let dataQuery = supabase
    .from("patients")
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)");

  if (search) {
    const like = `%${search}%`;
    const filter = `user.first_name.ilike.${like},user.last_name.ilike.${like},patient_number.ilike.${like}`;
    countQuery = countQuery.or(filter);
    dataQuery = dataQuery.or(filter);
  }

  const { count: total } = await countQuery;
  if (total === null) return err("Failed to count", 500);

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return err(error.message, 500);
  return paginated(data, total, page, pageSize);
});

// POST /api/patients — create patient (auth user + profile). RLS requires staff role.
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<any>(req);

  const { email, password, first_name, last_name } = body;
  if (!email || !password || !first_name || !last_name) {
    throw new ValidationError("Missing required fields: email, password, first_name, last_name");
  }

  // Get org_id of the creating user
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — visit /api/auth/setup-super-admin to re-create it", 404);

  // Create auth user (use service admin to bypass signup rate limits)
  const svc = createServiceClient();
  const { data: authData, error: signUpError } = await svc.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (signUpError) return err(signUpError.message, 400);
  if (!authData.user) return err("Failed to create auth user", 500);

  // Create user profile
  const { error: userError } = await svc.from("users").insert({
    id: authData.user.id, org_id: orgId, email, role: "patient",
    first_name, last_name, phone: body.phone || null, password_hash: "",
  });
  if (userError) return err(userError.message, 500);

  // Generate patient number
  const { count } = await supabase.from("patients").select("id", { count: "exact", head: true });
  const patientNumber = `PT-${String((count || 0) + 1).padStart(4, "0")}`;

  // Create patient record
  const patientFields: Record<string, any> = {
    org_id: orgId, user_id: authData.user.id, patient_number: patientNumber,
  };
  for (const k of ["date_of_birth", "gender", "blood_group", "genotype", "marital_status", "address", "city", "state",
    "emergency_contact_name", "emergency_contact_phone"] as const)
    if (body[k] !== undefined && body[k] !== "") patientFields[k] = body[k];

  const { data: patient, error: patientError } = await svc
    .from("patients").insert(patientFields)
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)")
    .single();

  if (patientError) return err(patientError.message, 500);
  await logAudit(req, authUserId, { action: "create", entityType: "patients", entityId: patient.id, description: `Patient ${patientNumber} (${first_name} ${last_name}) registered` });
  return ok(patient, 201);
});
