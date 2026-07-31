import { withAuth, ok } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const svc = createServiceClient();
  const { count, error } = await svc
    .from("internal_message_recipients")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", authUserId)
    .eq("is_read", false);

  if (error) return ok({ unread: 0 });
  return ok({ unread: count || 0 });
});
