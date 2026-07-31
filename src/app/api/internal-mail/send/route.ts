import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    recipient_ids?: string[];
    broadcast?: boolean;
    broadcast_scope?: "staff" | "all";
    subject: string;
    body: string;
  }>(req);

  if (!body.subject?.trim()) throw new ValidationError("Subject is required");
  if (!body.body?.trim()) throw new ValidationError("Body is required");

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  let recipientIds: string[] = [];

  if (body.broadcast) {
    const scope = body.broadcast_scope || "staff";
    let q = svc.from("users").select("id").eq("org_id", orgId);
    if (scope === "staff") {
      q = q.in("role", ["admin", "doctor", "nurse", "accountant", "super_admin", "staff"]);
    }
    const { data: users } = await q;
    if (users) {
      recipientIds = users.map((u: any) => u.id).filter((id: string) => id !== authUserId);
    }
  } else if (body.recipient_ids?.length) {
    recipientIds = body.recipient_ids;
  }

  if (!recipientIds.length) return err("No recipients specified", 400);

  // Create the message
  const { data: msg, error: msgErr } = await svc.from("internal_messages").insert({
    org_id: orgId,
    sender_id: authUserId,
    subject: body.subject.trim(),
    body: body.body.trim(),
    is_broadcast: body.broadcast || false,
    broadcast_scope: body.broadcast ? (body.broadcast_scope || "staff") : null,
  }).select().single();

  if (msgErr || !msg) return err(msgErr?.message || "Failed to create message", 500);

  // Create recipient records
  const recipients = recipientIds.map((recipient_id: string) => ({
    message_id: msg.id,
    recipient_id,
  }));

  const { error: recErr } = await svc.from("internal_message_recipients").insert(recipients);
  if (recErr) return err(recErr.message, 500);

  // Create notifications for all recipients
  const notifications = recipientIds.map((uid: string) => ({
    org_id: orgId,
    user_id: uid,
    type: "internal_message" as const,
    title: `New message: ${body.subject.trim()}`,
    message: body.body.trim().slice(0, 150),
    link: "/admin/internal-mail",
    is_read: false,
    sent_at: new Date().toISOString(),
  }));

  const { error: notifErr } = await svc.from("notifications").insert(notifications);
  if (notifErr) console.error("[internal-mail] notification insert error:", notifErr);

  return ok(msg, 201);
});
