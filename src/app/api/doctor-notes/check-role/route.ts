import { withAuth, ok } from "@/lib/api-utils";

const ALLOWED_ROLES = ["doctor", "nurse"];

export const GET = withAuth(async (req, supabase, authUserId) => {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  const isClinician = !!(user && ALLOWED_ROLES.includes(user.role));
  return ok({ isClinician, role: user?.role || null });
});
