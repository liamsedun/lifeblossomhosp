import { withAuth, ok, err } from "@/lib/api-utils";

const ME_SELECT = "*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUserId)
    .single();

  if (!user || user.role !== "patient") return err("Only patients can access this endpoint", 403);

  // Base select always succeeds in any migration state
  let { data, error } = await supabase
    .from("patients")
    .select(ME_SELECT)
    .eq("user_id", authUserId)
    .maybeSingle();

  if (error) return err(error.message, 500);
  if (!data) return err("Patient record not found", 404);

  // Enrich with optional columns (medical_plan, marital_status) if they exist.
  // Added after base select so a missing column (pending migration) never
  // breaks the endpoint.
  data.medical_plan = "individual";
  data.marital_status = "single";
  const { data: extra, error: extraError } = await supabase
    .from("patients")
    .select("medical_plan, marital_status")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (!extraError && extra) {
    if (extra.medical_plan) data.medical_plan = extra.medical_plan;
    if (extra.marital_status) data.marital_status = extra.marital_status;
  }

  return ok(data);
});
