import { NextRequest } from "next/server";
import { withAuth, ok, err, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/system/reset — SUPER ADMIN ONLY
 *
 * Wipes all entered data (users except the calling super admin, patients,
 * staff, invoices, expenses, other income, appointments, chats, internal
 * mail, notifications, clinical notes, medical records, prescriptions,
 * duty roster, medical reports, audit logs, push subscriptions) while
 * keeping the system configuration: hospital settings (name, logo,
 * address, contact, prefixes), bank accounts, landing doctors, and every
 * feature/formula of the app itself.
 *
 * Intended for the software-developer → hospital-management handover.
 */
const DELETE_TABLES = [
  "duty_roster",
  "internal_message_recipients",
  "internal_messages",
  "chat_messages",
  "chat_presence",
  "chats",
  "notifications",
  "push_subscriptions",
  "doctor_notes",
  "medical_reports",
  "prescription_items",
  "prescriptions",
  "medical_records",
  "invoice_items",
  "payments",
  "invoices",
  "other_income",
  "expenses",
  "appointments",
  "audit_logs",
  "patients",
  "staff",
];

// Tables without an org_id column — wiped via their parent's org-scoped ids.
const CHILD_TABLES: Record<string, { parent: string; column: string }> = {
  internal_message_recipients: { parent: "internal_messages", column: "message_id" },
  prescription_items: { parent: "prescriptions", column: "prescription_id" },
  invoice_items: { parent: "invoices", column: "invoice_id" },
  push_subscriptions: { parent: "users", column: "user_id" },
};

export const POST = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || caller.role !== "super_admin") {
    return err("Not authorized. Only the SUPER ADMIN can reset the system.", 403);
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const deleted: Record<string, number> = {};

  // 1. Wipe all org-scoped entered data (children before parents)
  for (const table of DELETE_TABLES) {
    const child = CHILD_TABLES[table];
    if (child) {
      const { data: parents } = await svc.from(child.parent).select("id").eq("org_id", orgId);
      const parentIds = (parents || []).map((p: any) => p.id);
      let childDeleted = 0;
      for (let i = 0; i < parentIds.length; i += 100) {
        const { data, error } = await svc.from(table).delete().in(child.column, parentIds.slice(i, i + 100)).select("id");
        if (error) {
          console.error(`[system/reset] delete ${table} failed:`, error.message);
          return err(`Failed to clear ${table}: ${error.message}`, 500);
        }
        childDeleted += data?.length || 0;
      }
      deleted[table] = childDeleted;
      continue;
    }
    const { data, error } = await svc.from(table).delete().eq("org_id", orgId).select("id");
    if (error) {
      console.error(`[system/reset] delete ${table} failed:`, error.message);
      return err(`Failed to clear ${table}: ${error.message}`, 500);
    }
    deleted[table] = data?.length || 0;
  }

  // 2. Remove every user profile except the calling super admin
  const { data: otherUsers, error: usersErr } = await svc
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .neq("id", authUserId);
  if (usersErr) return err(usersErr.message, 500);

  const userIds = (otherUsers || []).map((u: any) => u.id);
  deleted.users = userIds.length;

  const { error: delUsersErr } = await svc.from("users").delete().neq("id", authUserId).eq("org_id", orgId);
  if (delUsersErr) return err(delUsersErr.message, 500);

  // 3. Sign out and delete the auth accounts (keeps the super admin's login intact)
  let authDeleted = 0;
  for (const uid of userIds) {
    await svc.auth.admin.signOut(uid).catch(() => {});
    const { error } = await svc.auth.admin.deleteUser(uid);
    if (!error) authDeleted++;
  }
  deleted.auth_users = authDeleted;

  return ok({
    message: "System reset complete. All entered data has been cleared; the SUPER ADMIN account and system configuration are untouched.",
    deleted,
  });
});
