import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase) => {
  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id");
  const status = sp.get("status");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = supabase
    .from("prescriptions")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name)), items:prescription_items(*)",
      { count: "exact" });

  if (patientId) query = query.eq("patient_id", patientId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase) => {
  const body = await parseBody<{
    patient_id: string; doctor_id: string; appointment_id?: string;
    diagnosis?: string; notes?: string;
    items: Array<{
      medication_name: string; dosage: string; frequency: string;
      route?: string; duration?: string; quantity?: number; instructions?: string;
    }>;
  }>(req);

  if (!body.patient_id || !body.doctor_id) {
    throw new ValidationError("Missing required fields: patient_id, doctor_id");
  }
  if (!body.items?.length) {
    throw new ValidationError("At least one prescription item is required");
  }

  const { data: rx, error: rxError } = await supabase
    .from("prescriptions")
    .insert({
      patient_id: body.patient_id,
      doctor_id: body.doctor_id,
      appointment_id: body.appointment_id || null,
      diagnosis: body.diagnosis || null,
      notes: body.notes || null,
      status: "active",
    })
    .select("id").single();

  if (rxError) return err(rxError.message, 500);

  const items = body.items.map((it) => ({
    prescription_id: rx.id,
    medication_name: it.medication_name,
    dosage: it.dosage,
    frequency: it.frequency,
    route: it.route || "oral",
    duration: it.duration || null,
    quantity: it.quantity || null,
    instructions: it.instructions || null,
  }));

  const { data: createdItems, error: itemsError } = await supabase.from("prescription_items").insert(items).select();
  if (itemsError) return err(itemsError.message, 500);

  const { data: full } = await supabase
    .from("prescriptions")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name)), items:prescription_items(*)")
    .eq("id", rx.id).single();

  return ok({ ...full, items: createdItems }, 201);
});
