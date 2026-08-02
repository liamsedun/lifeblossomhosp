import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId, NotFoundError } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPushNotifications } from "@/lib/push-notifications";

const ALLOWED_ROLES = ["super_admin", "admin", "accountant"];

function fmtTime(t: string): string {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

// PUT /api/staff/roster/:id — reschedule/edit an existing duty shift
// Body: { shift_date?, from_time?, until_time?, note?, notify? }
// Rescheduling to a different date keeps the same row (updates in place).
export const PUT = withAuth(async (req, supabase, authUserId, ctx) => {
  const body = await parseBody<{ shift_date?: string; from_time?: string; until_time?: string; note?: string | null; notify?: boolean }>(req);
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || !ALLOWED_ROLES.includes(caller.role)) {
    return err("Not authorized. Admin role required.", 403);
  }

  const { id } = await ctx.params;

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d/;
  if (body.shift_date && !dateRe.test(body.shift_date)) throw new ValidationError("shift_date must be YYYY-MM-DD");
  if (body.from_time && !timeRe.test(body.from_time)) throw new ValidationError("from_time must be HH:MM");
  if (body.until_time && !timeRe.test(body.until_time)) throw new ValidationError("until_time must be HH:MM");

  const svc = createServiceClient();

  const { data: existing, error: fetchErr } = await svc
    .from("duty_roster")
    .select("*, staff:staff(id, org_id, user_id, staff_number, department, user:users(id, first_name, last_name))")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (fetchErr) return err(fetchErr.message, 500);
  if (!existing) throw new NotFoundError("Roster entry not found");

  const updates: Record<string, any> = {};
  if (body.shift_date) updates.shift_date = body.shift_date;
  if (body.from_time) updates.from_time = body.from_time.slice(0, 5);
  if (body.until_time) updates.until_time = body.until_time.slice(0, 5);
  if (body.note !== undefined) updates.note = body.note || null;
  if (Object.keys(updates).length === 0) {
    return err("Nothing to update — provide shift_date, from_time, until_time, or note", 400);
  }

  const { data: updated, error: updErr } = await svc
    .from("duty_roster")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select("*, staff:staff(id, staff_number, department, user:users(id, first_name, last_name))")
    .single();
  if (updErr) return err(updErr.message, 500);

  // Notify the scheduled staff member about the reschedule (best-effort)
  let notified = 0;
  if (body.notify !== false && updated?.user_id) {
    try {
      const { error: notifErr } = await svc.from("notifications").insert({
        org_id: orgId,
        user_id: updated.user_id,
        type: "duty_schedule",
        title: "Duty Schedule Updated",
        message: `Your duty schedule was updated: DATE: ${fmtDate(updated.shift_date)}, TIME: FROM: ${fmtTime(updated.from_time)} UNTIL: ${fmtTime(updated.until_time)}`,
        reference_type: "duty_roster",
        reference_id: id,
        is_read: false,
        created_at: new Date().toISOString(),
      });
      if (notifErr) console.error("[roster] update notification error:", notifErr);
      else notified = 1;

      const { data: subs } = await svc
        .from("push_subscriptions")
        .select("user_id, subscription_json")
        .eq("user_id", updated.user_id);
      if (subs && subs.length) {
        await sendPushNotifications(subs.map((s: any) => s.subscription_json), {
          title: "Duty Schedule Updated",
          body: `Your duty schedule was updated: DATE: ${fmtDate(updated.shift_date)}, TIME: FROM: ${fmtTime(updated.from_time)} UNTIL: ${fmtTime(updated.until_time)}`,
          url: "/admin/staff",
          tag: "duty-schedule",
        });
      }
    } catch (e) {
      console.error("[roster] update push error:", e);
    }
  }

  return ok({ roster: updated, notified });
});

// DELETE /api/staff/roster/:id — remove a duty shift
export const DELETE = withAuth(async (req, supabase, authUserId, ctx) => {
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || !ALLOWED_ROLES.includes(caller.role)) {
    return err("Not authorized. Admin role required.", 403);
  }

  const { id } = await ctx.params;
  const svc = createServiceClient();

  const { data: existing, error: fetchErr } = await svc
    .from("duty_roster")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (fetchErr) return err(fetchErr.message, 500);
  if (!existing) throw new NotFoundError("Roster entry not found");

  const { error: delErr } = await svc.from("duty_roster").delete().eq("id", id).eq("org_id", orgId);
  if (delErr) return err(delErr.message, 500);

  return ok({ deleted: true, id });
});
