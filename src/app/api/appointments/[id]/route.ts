import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase.from("appointments")
    .select("id, status, patient_id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["patient_id", "doctor_id", "appointment_date", "start_time", "end_time", "type", "status", "reason", "notes"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined && body[k] !== "") updates[k] = body[k];

  const { data, error } = await supabase.from("appointments").update(updates).eq("id", id)
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();
  if (error) return err(error.message, 500);

  // Auto-create notification for patient on status change
  if (body.status && body.status !== existing.status) {
    const { data: patient } = await supabase.from("patients")
      .select("user_id, user:users(org_id)").eq("id", existing.patient_id).single();
    if (patient) {
      const notifMap: Record<string, { title: string; message: string; type: string }> = {
        confirmed: { title: "Appointment Confirmed", message: "Your appointment has been confirmed.", type: "appointment_reminder" },
        completed: { title: "Appointment Completed", message: "Your appointment has been marked as completed.", type: "general" },
        cancelled: { title: "Appointment Cancelled", message: "Your appointment has been cancelled.", type: "general" },
      };
      const n = notifMap[body.status];
      if (n) {
        const user = Array.isArray(patient.user) ? patient.user[0] : patient.user;
        await supabase.from("notifications").insert({
          user_id: patient.user_id, type: n.type, title: n.title,
          message: n.message, link: "/patient/appointments", is_read: false,
          sent_at: new Date().toISOString(), org_id: (user as any)?.org_id || "",
        });
      }
    }
  }

  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data: existing } = await supabase.from("appointments").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return err(error.message, 500);
  return ok(null);
});
