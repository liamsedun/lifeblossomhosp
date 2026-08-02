import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withAuth, ok, err, parseBody, resolveOrgId, resolveParam, NotFoundError, ValidationError } from "@/lib/api-utils";
import { sendPushNotifications, type PushPayload } from "@/lib/push-notifications";

const MESSAGE_PAGE_SIZE = 20;

/** Verify the caller is a participant of this chat (patient or the assigned staff owner). */
async function assertParticipant(
  svc: ReturnType<typeof createServiceClient>,
  orgId: string,
  chatId: string,
  authUserId: string
): Promise<{ chat: any; role: string }> {
  const { data: chat } = await svc
    .from("chats")
    .select("*, patient:patients(id, user_id, org_id, user:users(id, first_name, last_name, avatar_url, phone))")
    .eq("id", chatId)
    .maybeSingle();

  if (!chat || chat.org_id !== orgId) throw new NotFoundError("Chat not found");

  const { data: caller } = await svc.from("users").select("id, role").eq("id", authUserId).single();
  const role = caller?.role ?? "patient";

  const isPatientOwner = chat.patient?.user_id === authUserId;
  const isStaffOwner = chat.staff_user_id === authUserId;

  if (!isPatientOwner && !isStaffOwner) throw new NotFoundError("Chat not found");
  return { chat, role };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, supabase, authUserId) => {
    const svc = createServiceClient();
    const orgId = await resolveOrgId(supabase, authUserId);
    if (!orgId) return err("Org not found", 404);
    const { id: chatId } = await ctx.params;

    const { chat, role } = await assertParticipant(svc, orgId, chatId, authUserId);

    const url = new URL(req.url);
    const before = url.searchParams.get("before");
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || String(MESSAGE_PAGE_SIZE), 10) || MESSAGE_PAGE_SIZE));

    let query = svc
      .from("chat_messages")
      .select("id, chat_id, sender_id, message, is_read, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) query = query.lt("created_at", before);

    const { data: messages, error } = await query;
    if (error) return err(error.message, 500);

    const sorted = (messages ?? []).reverse();

    // Fetch the other participant's profile for the window header
    let other: any = null;
    if (role === "patient") {
      const { data: u } = await svc
        .from("users")
        .select("id, first_name, last_name, role, avatar_url, phone")
        .eq("id", chat.staff_user_id)
        .single();
      other = u;
    } else {
      const p = chat.patient;
      if (p?.user) {
        other = { id: p.user_id, first_name: p.user.first_name, last_name: p.user.last_name, role: "patient", avatar_url: p.user.avatar_url ?? null, phone: p.user.phone ?? null };
      }
    }

    return ok({
      messages: sorted,
      chat_id: chatId,
      other_user: other
        ? {
            id: other.id,
            first_name: other.first_name,
            last_name: other.last_name,
            role: other.role,
            avatar_url: other.avatar_url ?? null,
            phone: other.phone ?? null,
          }
        : null,
      has_more: (messages ?? []).length >= limit,
    });
  })(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, supabase, authUserId) => {
    const svc = createServiceClient();
    const orgId = await resolveOrgId(supabase, authUserId);
    if (!orgId) return err("Org not found", 404);
    const { id: chatId } = await ctx.params;

    const { chat, role } = await assertParticipant(svc, orgId, chatId, authUserId);

    const body = await parseBody<{ message: string }>(req);
    const message = (body.message ?? "").trim();
    if (!message) throw new ValidationError("Message cannot be empty");

    const { data: inserted, error: insertError } = await svc
      .from("chat_messages")
      .insert({ chat_id: chatId, sender_id: authUserId, message })
      .select()
      .single();
    if (insertError) return err(insertError.message, 500);

    // Bump the chat row so inbox ordering stays fresh
    const { error: bumpError } = await svc
      .from("chats")
      .update({ last_message: message, last_sender_id: authUserId, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", chatId);
    if (bumpError) console.error("[Chat] bump error:", bumpError.message);

    // ── Notify the other participant ──
    const { data: sender } = await svc
      .from("users")
      .select("id, first_name, last_name, role")
      .eq("id", authUserId)
      .single();

    const recipientId = role === "patient" ? chat.staff_user_id : chat.patient?.user_id;
    const senderName = sender ? `${sender.first_name} ${sender.last_name}`.trim() : "Someone";
    const recipientRole = role === "patient" ? "staff" : "patient";
    const link = recipientRole === "patient" ? `/patient/chats/${chatId}` : `/admin/chats/${chatId}`;

    if (recipientId && recipientId !== authUserId) {
      const { error: notifError } = await svc.from("notifications").insert({
        org_id: orgId,
        user_id: recipientId,
        type: "chat_message",
        title: `New message from ${senderName}`,
        message: message.length > 120 ? message.slice(0, 117) + "..." : message,
        reference_type: "chat",
        reference_id: chatId,
      });
      if (notifError) console.error("[Chat] notification insert error:", notifError.message);

      // Web push (best-effort)
      try {
        const { data: subs } = await svc
          .from("push_subscriptions")
          .select("subscription_json")
          .eq("user_id", recipientId);
        if (subs && subs.length > 0) {
          const payload: PushPayload = {
            title: `💬 New message from ${senderName}`,
            body: message.length > 140 ? message.slice(0, 137) + "..." : message,
            url: link,
            tag: `chat-${chatId}`,
            requireInteraction: false,
          };
          await sendPushNotifications(subs.map((s: any) => s.subscription_json), payload);
        }
      } catch (pushErr) {
        console.error("[Chat] web push error:", pushErr);
      }
    }

    return ok({
      message: {
        id: inserted.id,
        chat_id: inserted.chat_id,
        sender_id: inserted.sender_id,
        message: inserted.message,
        is_read: inserted.is_read,
        created_at: inserted.created_at,
      },
    }, 201);
  })(req, ctx);
}
