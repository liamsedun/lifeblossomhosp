import { NextResponse } from "next/server";
import { withAuth, err, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

// Full-system backup — super admin only.
// Exports every org-scoped table (plus the org row itself) as JSON so the
// entire system can be rebuilt after a total site crash.
// Excluded (transient / device-bound, cannot be restored meaningfully):
//   push_subscriptions, chat_presence
const BACKUP_TABLES = [
  "users",
  "staff",
  "patients",
  "doctor_notes",
  "medical_reports",
  "medical_records",
  "prescriptions",
  "prescription_items",
  "invoices",
  "invoice_items",
  "payments",
  "expenses",
  "other_income",
  "appointments",
  "notifications",
  "chats",
  "chat_messages",
  "internal_messages",
  "internal_message_recipients",
  "audit_logs",
  "security_events",
  "duty_roster",
  "hospital_bank_accounts",
  "landing_doctors",
] as const;

export const GET = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || caller.role !== "super_admin") {
    return err("Not authorized. Super admin only.", 403);
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();

  const { data: orgRows } = await svc.from("organizations").select("*").eq("id", orgId);
  const org = orgRows?.[0] ?? null;

  const payload: Record<string, any> = {
    version: 1,
    createdAt: new Date().toISOString(),
    orgId,
    organization: org,
    tables: {},
  };

  for (const table of BACKUP_TABLES) {
    const { data, error } = await svc.from(table).select("*").eq("org_id", orgId);
    if (error) {
      console.error(`[backup] error reading ${table}:`, error.message);
      payload.tables[table] = [];
      continue;
    }
    payload.tables[table] = data || [];
  }

  const stamp = new Date().toISOString().split("T")[0];
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="life-blossom-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
