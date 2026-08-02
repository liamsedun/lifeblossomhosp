import { withAuth, ok } from "@/lib/api-utils";

const WRITE_ROLES = ["doctor", "nurse"];
const READ_ROLES = ["doctor", "nurse", "admin", "super_admin"];

export const GET = withAuth(async (req, supabase, authUserId) => {
  const { data: user } = await supabase.from("users").select("role").eq("id", authUserId).single();
  const role = user?.role || null;
  return ok({
    isClinician: !!(role && WRITE_ROLES.includes(role)),
    canReadNotes: !!(role && READ_ROLES.includes(role)) || role === "patient",
    role,
  });
});
