import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withAuth, ok, err, resolveOrgId, resolveParam, NotFoundError } from "@/lib/api-utils";

/**
 * POST /api/chats/[id]/read
 * Marks all messages sent by the other participant as read.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, supabase, authUserId) => {
    const svc = createServiceClient();
    const orgId = await resolveOrgId(supabase, authUserId);
    if (!orgId) return err("Org not found", 404);
    const { id: chatId } = await ctx.params;

    const { data: chat } = await svc
      .from("chats")
      .select("*, patient:patients(id, user_id)")
      .eq("id", chatId)
      .maybeSingle();
    if (!chat || chat.org_id !== orgId) throw new NotFoundError("Chat not found");

    const { data: caller } = await svc.from("users").select("id, role").eq("id", authUserId).single();
    const role = caller?.role ?? "patient";
    const isPatientOwner = chat.patient?.user_id === authUserId;
    const isStaffOwner = chat.staff_user_id === authUserId;
    const isAdmin = role === "admin" || role === "super_admin";
    if (!isPatientOwner && !isStaffOwner && !isAdmin) throw new NotFoundError("Chat not found");

    const { error } = await svc
      .from("chat_messages")
      .update({ is_read: true })
      .eq("chat_id", chatId)
      .eq("is_read", false)
      .neq("sender_id", authUserId);

    if (error) return err(error.message, 500);

    // Clear matching chat notifications so the bell badge stays accurate
    const { error: notifError } = await svc
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", authUserId)
      .eq("type", "chat_message")
      .eq("reference_id", chatId)
      .eq("is_read", false);

    if (notifError) console.error("[Chat] mark notifications read error:", notifError.message);

    return ok({ updated: true });
  })(req, ctx);
}
