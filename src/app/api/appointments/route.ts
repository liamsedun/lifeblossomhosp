import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId } from "@/lib/api-utils";

// GET /api/appointments — list (auto-scopes to patient for patient-role users)
export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id") || await resolvePatientId(supabase, authUserId);
  const doctorId = sp.get("doctor_id");
  const status = sp.get("status");
  const date = sp.get("date");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = supabase
    .from("appointments")
    .select("*, patient:patients(*, user:users(id, first_name, last_name, phone)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))",
      { count: "exact" });

  if (patientId) query = query.eq("patient_id", patientId);
  if (doctorId) query = query.eq("doctor_id", doctorId);
  if (status) query = query.eq("status", status);
  if (date) query = query.eq("appointment_date", date);

  const { data, error, count } = await query.order("appointment_date", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

// POST /api/appointments
export const POST = withAuth(async (req, supabase) => {
  const body = await parseBody<{
    patient_id: string; doctor_id?: string; appointment_date: string;
    start_time: string; end_time?: string; type?: string; reason?: string;
  }>(req);

  if (!body.patient_id || !body.appointment_date || !body.start_time) {
    throw new ValidationError("Missing required fields: patient_id, appointment_date, start_time");
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: body.patient_id,
      doctor_id: body.doctor_id || null,
      appointment_date: body.appointment_date,
      start_time: body.start_time,
      end_time: body.end_time || null,
      type: body.type || "in_person",
      reason: body.reason || null,
    })
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
