import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit, logView } from "@/lib/audit";

export const GET = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  await logView(req, authUserId, "appointments", id, "Viewed appointment detail");
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase.from("appointments")
    .select("id, status, patient_id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["patient_id", "doctor_id", "appointment_date", "start_time", "end_time", "type", "status", "reason", "notes"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined && body[k] !== "") updates[k] = body[k];

  const { data, error } = await svc.from("appointments").update(updates).eq("id", id)
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), doctor:staff!doctor_id(*, user:users(id, first_name, last_name))")
    .single();
  if (error) return err(error.message, 500);

  await logAudit(req, authUserId, { action: "update", entityType: "appointments", entityId: id, description: body.status && body.status !== existing.status ? `Appointment status changed to ${body.status}` : "Appointment updated" });

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
        await svc.from("notifications").insert({
          user_id: patient.user_id, type: n.type, title: n.title,
          message: n.message, link: "/patient/appointments", is_read: false,
          created_at: new Date().toISOString(), org_id: (user as any)?.org_id || "",
        });
      }
    }
  }

  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data: existing } = await supabase.from("appointments").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { error } = await svc.from("appointments").delete().eq("id", id);
  if (error) return err(error.message, 500);
  await logAudit(req, authUserId, { action: "delete", entityType: "appointments", entityId: id, description: "Appointment deleted" });
  return ok(null);
});
