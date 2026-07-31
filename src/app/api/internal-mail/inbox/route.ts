import { NextRequest } from "next/server";
import { withAuth, ok, err, getPagination, paginated } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const { page, pageSize, from, to } = getPagination(sp);

  const svc = createServiceClient();

  const { data, error, count } = await svc
    .from("internal_message_recipients")
    .select("id, message_id, is_read, read_at, created_at, internal_messages!inner(id, org_id, sender_id, subject, body, is_broadcast, broadcast_scope, created_at)", { count: "exact" })
    .eq("recipient_id", authUserId)
    .order("created_at", { ascending: false, referencedTable: "internal_messages" })
    .range(from, to);

  if (error) return err(error.message, 500);

  const rows = data || [];

  // Enrich with sender info
  const senderIds = [...new Set(rows.map((r: any) => r.internal_messages?.sender_id).filter(Boolean))];
  let senderMap: Record<string, any> = {};
  if (senderIds.length) {
    const { data: senders } = await svc.from("users").select("id, first_name, last_name, role, avatar_url").in("id", senderIds);
    if (senders) {
      senderMap = Object.fromEntries(senders.map((s: any) => [s.id, {
        ...s,
        full_name: [s.first_name, s.last_name].filter(Boolean).join(" ") || "Unknown",
      }]));
    }
  }

  const enriched = rows.map((r: any) => {
    const msg = r.internal_messages || {};
    return {
      ...msg,
      recipient_row_id: r.id,
      recipient_id: r.recipient_id,
      is_read: r.is_read,
      read_at: r.read_at,
      sender: senderMap[msg.sender_id] || null,
    };
  });

  return paginated(enriched, count || 0, page, pageSize);
});
