import { NextRequest } from "next/server";
import { withAuth, ok, err, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("users")
    .select("id, first_name, last_name, role, avatar_url")
    .eq("org_id", orgId)
    .order("first_name", { ascending: true });

  if (error) return err(error.message, 500);

  const users = data || [];
  const staff = users.filter((u: any) => u.role !== "patient" && u.id !== authUserId);
  const patients = users.filter((u: any) => u.role === "patient" && u.id !== authUserId);

  return ok({ staff, patients });
});
