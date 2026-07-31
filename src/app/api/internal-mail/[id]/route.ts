import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * DELETE /api/internal-mail/[id]?view=inbox|sent
 *
 * - view=inbox: remove the message from MY inbox (deletes only my recipient record).
 * - view=sent:  delete the message entirely (sender only; cascades to all recipients).
 */
export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;
  if (!id) return err("Message id required", 400);

  const sp = new URL(req.url).searchParams;
  const view = sp.get("view") || "inbox";
  const svc = createServiceClient();

  if (view === "sent") {
    const { error } = await svc
      .from("internal_messages")
      .delete()
      .eq("id", id)
      .eq("sender_id", authUserId);
    if (error) return err(error.message, 500);
    return ok({ deleted: true, view });
  }

  // inbox — delete only my recipient row
  const { error } = await svc
    .from("internal_message_recipients")
    .delete()
    .eq("id", id)
    .eq("recipient_id", authUserId);
  if (error) return err(error.message, 500);
  return ok({ deleted: true, view });
});
