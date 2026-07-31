import { NextRequest } from "next/server";
import { withAuth, ok, err, resolveParam } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  if (!id) return err("Message recipient id required", 400);

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("internal_message_recipients")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", authUserId)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
});
