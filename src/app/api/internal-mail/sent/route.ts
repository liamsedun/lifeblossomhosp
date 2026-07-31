import { NextRequest } from "next/server";
import { withAuth, ok, err, getPagination, paginated } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const { page, pageSize, from, to } = getPagination(sp);

  const svc = createServiceClient();

  const { data, error, count } = await svc
    .from("internal_messages")
    .select("*, sender:sender_id(id, full_name, role, avatar_url)", { count: "exact" })
    .eq("sender_id", authUserId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return err(error.message, 500);

  // Enrich each message with recipient count
  const enriched = await Promise.all(
    (data || []).map(async (msg: any) => {
      const { count: recvCount, error: _ } = await svc
        .from("internal_message_recipients")
        .select("*", { count: "exact", head: true })
        .eq("message_id", msg.id);
      return {
        ...msg,
        recipient_count: recvCount || 0,
      };
    })
  );

  return paginated(enriched, count || 0, page, pageSize);
});
