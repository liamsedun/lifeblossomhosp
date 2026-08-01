import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase.from("notifications").select("*").eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const svc = createServiceClient();
  const body = await parseBody<any>(req);
  const { data: existing } = await supabase.from("notifications").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { data, error } = await svc.from("notifications").update({ is_read: body.is_read ?? true }).eq("id", id).select().single();
  if (error) return err(error.message, 500);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  // Delete one of the caller's own notifications (ownership checked via the
  // caller-scoped client, then removed with the user filter on the service client).
  const { id } = await context.params;
  const svc = createServiceClient();
  const { data: existing } = await supabase.from("notifications").select("id").eq("id", id).maybeSingle();
  if (!existing) return err("Not found", 404);
  const { data, error } = await svc
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", authUserId)
    .select("id")
    .maybeSingle();
  if (error) return err(error.message, 500);
  return ok(data);
});
