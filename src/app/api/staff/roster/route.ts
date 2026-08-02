import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPushNotifications } from "@/lib/push-notifications";

interface RosterEntryInput {
  staff_id: string;
  user_id?: string | null;
  shift_date: string;
  from_time: string;
  until_time: string;
  note?: string | null;
}

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

// GET /api/staff/roster?from=YYYY-MM-DD&to=YYYY-MM-DD&staff_id=...&department=...
export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || ["patient"].includes(caller.role)) {
    return err("Not authorized", 403);
  }

  let query = supabase
    .from("duty_roster")
    .select("*, staff:staff!inner(id, staff_number, department, user:users(id, first_name, last_name, avatar_url, role, email))")
    .eq("org_id", orgId);

  const from = sp.get("from");
  const to = sp.get("to");
  if (from) query = query.gte("shift_date", from);
  if (to) query = query.lte("shift_date", to);
  const staffId = sp.get("staff_id");
  if (staffId) query = query.eq("staff_id", staffId);
  const department = sp.get("department");
  if (department && department !== "All") query = query.eq("staff.department", department);

  const { data, error } = await query.order("shift_date", { ascending: true });
  if (error) return err(error.message, 500);
  return ok(data);
});

// POST /api/staff/roster
// Body: { entries: [{ staff_id, user_id?, shift_date, from_time, until_time, note? }], notify?: boolean }
// Creates/updates duty shifts (one per staff per date) and, when notify is true,
// sends each scheduled staff member an in-app notification + push:
//   "DATE: Sat 02 Aug 2026, TIME: FROM: 08:00 AM UNTIL: 04:00 PM"
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{ entries: RosterEntryInput[]; notify?: boolean }>(req);
  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    throw new ValidationError("entries array is required");
  }
  if (body.entries.length > 2000) {
    throw new ValidationError("Too many entries (max 2000)");
  }

  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || !["super_admin", "admin", "accountant"].includes(caller.role)) {
    return err("Not authorized. Admin role required.", 403);
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  // Validate date/time shape
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d/;
  for (const e of body.entries) {
    if (!e.staff_id || !dateRe.test(e.shift_date) || !timeRe.test(e.from_time) || !timeRe.test(e.until_time)) {
      throw new ValidationError("Each entry needs staff_id, a YYYY-MM-DD shift_date, and HH:MM from_time/until_time");
    }
  }

  const svc = createServiceClient();

  // Ensure all staff belong to this org, and collect their user ids
  const staffIds = [...new Set(body.entries.map((e) => e.staff_id))];
  const { data: staffRows, error: staffErr } = await svc
    .from("staff")
    .select("id, user_id")
    .eq("org_id", orgId)
    .in("id", staffIds);
  if (staffErr) return err(staffErr.message, 500);
  const userByStaff = new Map<string, string>();
  (staffRows || []).forEach((s: any) => userByStaff.set(s.id, s.user_id));
  for (const id of staffIds) {
    if (!userByStaff.has(id)) return err("One or more staff members not found in this organization", 400);
  }

  // Upsert roster rows (one per staff per date — re-scheduling overwrites)
  const rows = body.entries.map((e) => ({
    org_id: orgId,
    staff_id: e.staff_id,
    user_id: e.user_id || userByStaff.get(e.staff_id) || null,
    shift_date: e.shift_date,
    from_time: e.from_time.slice(0, 5),
    until_time: e.until_time.slice(0, 5),
    note: e.note || null,
    created_by: authUserId,
  }));

  const { data: created, error: insErr } = await svc
    .from("duty_roster")
    .upsert(rows, { onConflict: "staff_id,shift_date" })
    .select();
  if (insErr) return err(insErr.message, 500);

  // ── Notifications (in-app + push) for each scheduled staff member ──
  let notified = 0;
  if (body.notify !== false) {
    const notifications = rows.map((r) => ({
      org_id: orgId,
      user_id: r.user_id,
      type: "duty_schedule" as const,
      title: "Duty Schedule",
      message: `You are scheduled for duty: DATE: ${fmtDate(r.shift_date)}, TIME: FROM: ${fmtTime(r.from_time)} UNTIL: ${fmtTime(r.until_time)}`,
      reference_type: "duty_roster",
      reference_id: null,
      is_read: false,
      created_at: new Date().toISOString(),
    })).filter((n) => n.user_id);

    if (notifications.length) {
      const { error: notifErr } = await svc.from("notifications").insert(notifications);
      if (notifErr) console.error("[roster] notification insert error:", notifErr);
      else notified = notifications.length;
    }

    // Push to subscribed devices of the scheduled staff — best-effort only:
    // a push failure must NEVER fail the roster save (the rows are already
    // committed above). Without this guard, staff with a stale/expired push
    // subscription would get "Internal server error" even though the
    // schedule was saved successfully.
    const userIds = [...new Set(notifications.map((n) => n.user_id).filter(Boolean))] as string[];
    if (userIds.length) {
      try {
        const { data: subs } = await svc
          .from("push_subscriptions")
          .select("user_id, subscription_json")
          .in("user_id", userIds);
        if (subs && subs.length) {
          const byUser = new Map<string, any[]>();
          (subs as any[]).forEach((s) => {
            const arr = byUser.get(s.user_id) || [];
            arr.push(s.subscription_json);
            byUser.set(s.user_id, arr);
          });
          for (const [uid, list] of byUser) {
            const entry = rows.find((r) => r.user_id === uid);
            if (!entry) continue;
            await sendPushNotifications(list, {
              title: "Duty Schedule",
              body: `You are scheduled for duty: DATE: ${fmtDate(entry.shift_date)}, TIME: FROM: ${fmtTime(entry.from_time)} UNTIL: ${fmtTime(entry.until_time)}`,
              url: "/admin/staff",
              tag: "duty-schedule",
              requireInteraction: false,
            });
          }
        }
      } catch (e) {
        console.error("[roster] push notification error:", e);
      }
    }
  }

  return ok({ roster: created, notified }, 201);
});
