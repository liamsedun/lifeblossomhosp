import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, getPagination } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase) => {
  const sp = new URL(req.url).searchParams;
  const entityType = sp.get("entity_type");
  const entityId = sp.get("entity_id");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = supabase
    .from("audit_logs")
    .select("*, user:users(id, first_name, last_name, email)", { count: "exact" });

  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});
