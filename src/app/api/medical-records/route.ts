import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId } from "@/lib/api-utils";
import { logView } from "@/lib/audit";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id") || await resolvePatientId(supabase, authUserId);
  const recordType = sp.get("record_type");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = supabase
    .from("medical_records")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))",
      { count: "exact" });

  if (patientId) query = query.eq("patient_id", patientId);
  if (recordType) query = query.eq("record_type", recordType);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);

  if (patientId && data && data.length > 0) {
    await logView(req, authUserId, "medical_records", patientId, `Listed ${(data as any[]).length} medical record(s) for patient ${patientId}`);
  }

  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase) => {
  const body = await parseBody<{
    patient_id: string; doctor_id?: string; appointment_id?: string;
    record_type: string; title: string; description?: string;
    diagnosis?: string; treatment?: string; notes?: string;
    is_confidential?: boolean;
  }>(req);

  if (!body.patient_id || !body.record_type || !body.title) {
    throw new ValidationError("Missing required fields: patient_id, record_type, title");
  }

  const { data, error } = await supabase
    .from("medical_records")
    .insert({
      patient_id: body.patient_id,
      doctor_id: body.doctor_id || null,
      appointment_id: body.appointment_id || null,
      record_type: body.record_type,
      title: body.title,
      description: body.description || null,
      diagnosis: body.diagnosis || null,
      treatment: body.treatment || null,
      notes: body.notes || null,
      is_confidential: body.is_confidential || false,
    })
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
