import { withAuth, ok, err } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUserId)
    .single();

  if (!user || user.role !== "patient") return err("Only patients can access this endpoint", 403);

  const { data, error } = await supabase
    .from("patients")
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (error) return err(error.message, 500);
  if (!data) return err("Patient record not found", 404);
  return ok(data);
});
