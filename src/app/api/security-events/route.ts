import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, getPagination } from "@/lib/api-utils";

const ADMIN_ROLES = ["super_admin", "admin"];

/**
 * GET /api/security-events
 *
 * Admin-only. Lists anomaly/security events (failed logins, rapid views,
 * lockouts). Filterable by event_type, severity, user, and date range.
 */
export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUserId)
    .single();
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return err("Only admins can view security events", 403);
  }

  const eventType = sp.get("event_type");
  const severity = sp.get("severity");
  const userId = sp.get("user_id");
  const from = sp.get("from");
  const to = sp.get("to");
  const { page, pageSize, from: offset, to: end } = getPagination(sp);

  let query = supabase
    .from("security_events")
    .select("*, user:users(id, first_name, last_name, email)", { count: "exact" });

  if (eventType) query = query.eq("event_type", eventType);
  if (severity) query = query.eq("severity", severity);
  if (userId) query = query.eq("user_id", userId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, end);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});
