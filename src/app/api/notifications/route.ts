import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, getPagination, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

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
  const svc = createServiceClient();
  const { data, error } = await svc.from("notifications").update({ is_read: true }).select();
  if (error) return err(error.message, 500);
  return ok(data);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    user_id: string; type: string; title: string; message?: string; link?: string;
  }>(req);

  if (!body.user_id || !body.type || !body.title) {
    throw new ValidationError("Missing required fields: user_id, type, title");
  }

  // Get admin's org_id
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found", 404);

  const svc = createServiceClient();
  const { data, error } = await svc.from("notifications").insert({
    org_id: orgId,
    user_id: body.user_id,
    type: body.type,
    title: body.title,
    message: body.message || null,
    link: body.link || null,
    is_read: false,
    sent_at: new Date().toISOString(),
  }).select().single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
