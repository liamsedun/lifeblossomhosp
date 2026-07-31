import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_ROLES = ["doctor", "nurse"];

async function checkRole(supabase: any, authUserId: string): Promise<string | null> {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;
  return user.role;
}

export const GET = withAuth(async (req, supabase, authUserId) => {
  const role = await checkRole(supabase, authUserId);
  if (!role) return err("Forbidden: only doctors and nurses can access clinical notes", 403);

  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id");
  if (!patientId) return err("patient_id is required", 400);

  const { page, pageSize, from, to } = getPagination(sp);
  const svc = createServiceClient();

  const { data, error, count } = await svc
    .from("doctor_notes")
    .select("*, doctor:staff!doctor_id(*, user:users(id, first_name, last_name))", { count: "exact" })
    .eq("patient_id", patientId)
    .order("visit_date", { ascending: false })
    .range(from, to);

  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const role = await checkRole(supabase, authUserId);
  if (!role) return err("Forbidden: only doctors and nurses can create clinical notes", 403);

  const body = await parseBody<{
    patient_id: string; doctor_id?: string; appointment_id?: string; visit_date?: string;
    vitals?: Record<string, string>; tests_procedures?: Record<string, string>;
    clinical_findings?: string; diagnosis?: Record<string, any>;
    medications?: Array<Record<string, string>>; treatment_recommendations?: string;
    next_visit_date?: string; next_visit_reason?: string;
  }>(req);

  if (!body.patient_id) throw new ValidationError("patient_id is required");

  const svc = createServiceClient();

  const { data, error } = await svc
    .from("doctor_notes")
    .insert({
      patient_id: body.patient_id,
      doctor_id: body.doctor_id || null,
      appointment_id: body.appointment_id || null,
      visit_date: body.visit_date || new Date().toISOString().split("T")[0],
      vitals: body.vitals || {},
      tests_procedures: body.tests_procedures || {},
      clinical_findings: body.clinical_findings || null,
      diagnosis: body.diagnosis || {},
      medications: body.medications || [],
      treatment_recommendations: body.treatment_recommendations || null,
      next_visit_date: body.next_visit_date || null,
      next_visit_reason: body.next_visit_reason || null,
      created_by: authUserId,
    })
    .select("*, doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
