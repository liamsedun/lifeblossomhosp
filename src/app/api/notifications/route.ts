import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, getPagination } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const isRead = sp.get("is_read");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = supabase.from("notifications").select("*", { count: "exact" });
  query = query.eq("user_id", authUserId);
  if (isRead !== null) query = query.eq("is_read", isRead === "true");

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const PUT = withAuth(async (req, supabase) => {
  // Mark all as read
  const { data, error } = await supabase.from("notifications").update({ is_read: true }).select();
  if (error) return err(error.message, 500);
  return ok(data);
});
