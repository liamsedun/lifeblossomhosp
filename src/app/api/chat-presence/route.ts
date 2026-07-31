import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withAuth, ok, err, resolveOrgId } from "@/lib/api-utils";

/**
 * POST /api/chat-presence
 * Heartbeat — records the caller as "online now" (client calls every ~30s).
 * GET  /api/chat-presence
 * Returns the set of org user ids seen within the last 60 seconds.
 */
export async function POST(req: NextRequest) {
  return withAuth(async (req, supabase, authUserId) => {
    const svc = createServiceClient();
    const orgId = await resolveOrgId(supabase, authUserId);
    if (!orgId) return err("Org not found", 404);

    const { error } = await svc.from("chat_presence").upsert(
      { user_id: authUserId, org_id: orgId, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) return err(error.message, 500);
    return ok({ online: true });
  })(req);
}

export async function GET(req: NextRequest) {
  return withAuth(async (req, supabase, authUserId) => {
    const svc = createServiceClient();
    const orgId = await resolveOrgId(supabase, authUserId);
    if (!orgId) return err("Org not found", 404);

    const { data: presence } = await svc
      .from("chat_presence")
      .select("user_id")
      .eq("org_id", orgId)
      .gte("last_seen_at", new Date(Date.now() - 60_000).toISOString());

    return ok({ online: (presence ?? []).map((p: any) => p.user_id) });
  })(req);
}
