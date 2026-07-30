import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, user:users(id, first_name, last_name, email)")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});
