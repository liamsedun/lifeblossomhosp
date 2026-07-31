import { withAuth, ok, err } from "@/lib/api-utils";

const ME_SELECT = "*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUserId)
    .single();

  if (!user || user.role !== "patient") return err("Only patients can access this endpoint", 403);

  // Try with medical_plan first; if the column doesn't exist yet (migration-006
  // not applied), fall back to the base select and default the plan to 'individual'.
  let { data, error } = await supabase
    .from("patients")
    .select(`${ME_SELECT}, medical_plan`)
    .eq("user_id", authUserId)
    .maybeSingle();

  if (error || !data) {
    const { data: base, error: baseError } = await supabase
      .from("patients")
      .select(ME_SELECT)
      .eq("user_id", authUserId)
      .maybeSingle();
    if (baseError) return err(baseError.message, 500);
    data = base;
    if (data) data.medical_plan = "individual";
  }

  if (!data) return err("Patient record not found", 404);
  return ok(data);
});
