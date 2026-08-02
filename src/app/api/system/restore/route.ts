import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

// Full-system restore — super admin only.
// POST body: the JSON produced by GET /api/system/backup.
//
// Behavior:
//  - Wipes all existing org data (like System Reset, but keeps the calling
//    super admin's account so the session survives).
//  - Recreates Supabase Auth accounts for restored users whose auth account
//    no longer exists (temporary password — admin resets via Users page).
//  - Users whose Supabase Auth account still exists keep their login
//    (same uid reused).
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
  "security_events",
  "patients",
  "staff",
  "users",
];

const T = {
  users: ["id", "org_id", "email", "password_hash", "role", "first_name", "last_name", "phone", "avatar_url", "is_active", "last_login_at", "created_at", "updated_at"],
  staff: ["id", "org_id", "user_id", "staff_number", "department", "specialization", "license_number", "years_of_exp", "qualification", "employment_type", "base_salary", "is_available", "available_from", "available_until", "on_leave_until", "created_at", "updated_at"],
  patients: ["id", "org_id", "user_id", "patient_number", "date_of_birth", "gender", "marital_status", "blood_group", "genotype", "medical_plan", "height_cm", "weight_kg", "allergies", "chronic_conditions", "address", "city", "state", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_rel", "is_primary_account", "primary_account_id", "dependant_relationship", "created_at", "updated_at"],
  appointments: ["id", "org_id", "patient_id", "doctor_id", "appointment_date", "start_time", "end_time", "type", "status", "reason", "notes", "created_by", "created_at", "updated_at"],
  medical_records: ["id", "org_id", "patient_id", "doctor_id", "appointment_id", "record_type", "title", "description", "diagnosis", "treatment", "notes", "attachments", "is_confidential", "created_at", "updated_at"],
  doctor_notes: ["id", "org_id", "patient_id", "doctor_id", "appointment_id", "visit_date", "vitals", "tests_procedures", "clinical_findings", "diagnosis", "medications", "treatment_recommendations", "next_visit_date", "next_visit_reason", "is_confidential", "created_by", "created_at", "updated_at"],
  medical_reports: ["id", "org_id", "patient_id", "reference_number", "report_date", "content", "author_name", "author_title", "created_by", "created_at", "updated_at"],
  prescriptions: ["id", "org_id", "patient_id", "doctor_id", "appointment_id", "diagnosis", "notes", "status", "issued_date", "expiry_date", "created_at", "updated_at"],
  prescription_items: ["id", "prescription_id", "medication_name", "dosage", "frequency", "route", "duration", "quantity", "refills", "notes", "created_at", "updated_at"],
  invoices: ["id", "org_id", "patient_id", "invoice_number", "issue_date", "due_date", "status", "subtotal", "tax_amount", "discount_amount", "total_amount", "paid_amount", "attending_staff_id", "notes", "created_by", "created_at", "updated_at"],
  invoice_items: ["id", "invoice_id", "description", "quantity", "unit_price", "vat_percent", "vat_amount", "total_price", "created_at"],
  payments: ["id", "org_id", "invoice_id", "patient_id", "amount", "payment_method", "status", "transaction_ref", "payment_date", "notes", "created_by", "created_at", "updated_at"],
  notifications: ["id", "org_id", "user_id", "type", "title", "message", "reference_type", "reference_id", "is_read", "created_at"],
  expenses: ["id", "org_id", "description", "category", "amount", "expense_date", "payment_method", "vendor", "notes", "created_by", "created_at", "updated_at"],
  other_income: ["id", "org_id", "description", "category", "amount", "income_date", "payment_method", "source", "notes", "created_by", "created_at", "updated_at"],
  chats: ["id", "org_id", "patient_id", "staff_user_id", "last_message", "last_sender_id", "last_message_at", "created_at", "updated_at"],
  chat_messages: ["id", "chat_id", "sender_id", "message", "is_read", "created_at"],
  internal_messages: ["id", "org_id", "sender_id", "subject", "body", "is_broadcast", "broadcast_scope", "created_at"],
  internal_message_recipients: ["id", "message_id", "recipient_id", "is_read", "read_at", "created_at"],
  audit_logs: ["id", "org_id", "user_id", "role", "action", "entity_type", "entity_id", "changes", "description", "ip_address", "user_agent", "created_at"],
  security_events: ["id", "org_id", "user_id", "event_type", "severity", "description", "ip_address", "user_agent", "metadata", "created_at"],
  duty_roster: ["id", "org_id", "staff_id", "user_id", "shift_date", "from_time", "until_time", "note", "created_by", "created_at", "updated_at"],
  hospital_bank_accounts: ["id", "org_id", "bank_name", "account_name", "account_number", "is_active", "created_at", "updated_at"],
  landing_doctors: ["id", "org_id", "name", "specialty", "available", "availability", "image_url", "sort_order", "is_active", "created_at", "updated_at"],
};

// FK remap: table -> { column: targetMap }
const REMAP: Record<string, Record<string, string>> = {
  staff: { user_id: "users" },
  patients: { user_id: "users", primary_account_id: "patients" },
  appointments: { patient_id: "patients", doctor_id: "staff", created_by: "users" },
  medical_records: { patient_id: "patients", doctor_id: "staff", appointment_id: "appointments" },
  doctor_notes: { patient_id: "patients", doctor_id: "staff", appointment_id: "appointments", created_by: "users" },
  medical_reports: { patient_id: "patients", created_by: "users" },
  prescriptions: { patient_id: "patients", doctor_id: "staff", appointment_id: "appointments" },
  prescription_items: { prescription_id: "prescriptions" },
  invoices: { patient_id: "patients", attending_staff_id: "users", created_by: "users" },
  invoice_items: { invoice_id: "invoices" },
  payments: { invoice_id: "invoices", patient_id: "patients", created_by: "users" },
  notifications: { user_id: "users" },
  expenses: { created_by: "users" },
  other_income: { created_by: "users" },
  chats: { patient_id: "patients", staff_user_id: "users", last_sender_id: "users" },
  chat_messages: { chat_id: "chats", sender_id: "users" },
  internal_messages: { sender_id: "users" },
  internal_message_recipients: { message_id: "internal_messages", recipient_id: "users" },
  audit_logs: { user_id: "users" },
  security_events: { user_id: "users" },
  duty_roster: { staff_id: "staff", user_id: "users", created_by: "users" },
};

function pick(row: any, cols: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const c of cols) {
    if (row && row[c] !== undefined) out[c] = row[c];
  }
  return out;
}

function randomTempPassword(): string {
  return `LB-${crypto.randomUUID().slice(0, 10)}!a1`;
}

export const POST = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role, email").eq("id", authUserId).single();
  if (!caller || caller.role !== "super_admin") {
    return err("Not authorized. Super admin only.", 403);
  }

  const body = await parseBody<any>(req);
  if (!body || body.version !== 1 || !body.tables || typeof body.tables !== "object") {
    throw new ValidationError("Invalid backup file — expected a version 1 backup JSON");
  }
  const tables = body.tables;
  for (const t of [...DELETE_TABLES, ...Object.keys(T)]) {
    if (tables[t] === undefined) tables[t] = [];
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();

  // ── 1. Wipe existing data (keep the calling super admin's users row) ──
  const wipeCounts: Record<string, number> = {};
  for (const table of DELETE_TABLES) {
    if (table === "users") {
      const { error } = await svc.from("users").delete().eq("org_id", orgId).neq("id", authUserId);
      if (error) return err(`Failed to wipe ${table}: ${error.message}`, 500);
      continue;
    }
    const { data: wipedRows, error } = await svc.from(table).delete().eq("org_id", orgId).select("id");
    if (error && error.code !== "42P01") {
      // Table may not exist on a freshly crashed site — ignore missing tables
      if (!error.message.includes("does not exist")) return err(`Failed to wipe ${table}: ${error.message}`, 500);
    }
    wipeCounts[table] = (wipedRows || []).length;
  }

  // ── 2. Restore the organization row itself ──
  if (body.organization && typeof body.organization === "object") {
    const orgPick = pick(body.organization, ["name", "slug", "logo_url", "settings", "is_active"]);
    await svc.from("organizations").update(orgPick).eq("id", orgId);
  }

  // ── 3. Recreate user accounts ──
  const idMap = new Map<string, string>(); // backup uid -> live uid
  let createdAccounts = 0;
  let reusedAccounts = 0;

  for (const u of tables.users || []) {
    const backupId = u.id;
    let liveId: string | null = null;

    if (backupId === authUserId) {
      // The caller survives the wipe — reuse their own account
      liveId = authUserId;
      reusedAccounts++;
    } else {
      const { data: existing } = await svc.auth.admin.getUserById(backupId).catch(() => ({ data: null }));
      if (existing?.user) {
        liveId = backupId;
        reusedAccounts++;
      } else {
        const { data: created, error: createErr } = await svc.auth.admin.createUser({
          email: u.email,
          password: randomTempPassword(),
          email_confirm: true,
          user_metadata: { org_id: orgId },
        });
        if (createErr) {
          // Duplicate email elsewhere — reuse that account instead
          const { data: page } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const match = (page?.users || []).find((x: any) => x.email?.toLowerCase() === (u.email || "").toLowerCase());
          if (match) {
            liveId = match.id;
            reusedAccounts++;
          } else {
            return err(`Failed to restore account ${u.email}: ${createErr.message}`, 500);
          }
        } else {
          liveId = created?.user?.id ?? null;
          if (liveId) createdAccounts++;
        }
      }
    }

    if (liveId) idMap.set(backupId, liveId);
  }

  const remapValue = (v: any, targetMap: string | undefined): any => {
    if (targetMap === undefined || v == null) return v;
    const map = idMap.get(String(v));
    return map || v; // keep original if unmapped (orphan-safe)
  };

  // ── 4. Insert users rows ──
  const userRows = (tables.users || []).filter((u: any) => idMap.has(u.id)).map((u: any) => {
    const row = pick(u, T.users);
    row.id = idMap.get(u.id);
    row.org_id = orgId;
    row.password_hash = "";
    if (row.id === authUserId) row.id = authUserId;
    return row;
  });
  for (const row of userRows) {
    if (row.id === authUserId) {
      const upd = { ...row };
      delete upd.id;
      delete upd.org_id;
      delete upd.created_at;
      await svc.from("users").update(upd).eq("id", authUserId);
    } else {
      const { error } = await svc.from("users").insert(row);
      if (error) return err(`Failed to restore user ${row.email || row.id}: ${error.message}`, 500);
    }
  }

  // ── 5. Insert the remaining tables (FK dependency order) ──
  const ORDER = [
    "staff", "patients",
    "appointments", "medical_records", "doctor_notes", "medical_reports",
    "prescriptions", "prescription_items",
    "invoices", "invoice_items", "payments",
    "expenses", "other_income",
    "notifications", "chats", "chat_messages",
    "internal_messages", "internal_message_recipients",
    "audit_logs", "security_events", "duty_roster",
    "hospital_bank_accounts", "landing_doctors",
  ];

  const restoredCounts: Record<string, number> = {};
  for (const table of ORDER) {
    const rows = tables[table] || [];
    if (rows.length === 0) continue;
    const cols = T[table as keyof typeof T];
    const remaps = REMAP[table as keyof typeof REMAP] || {};
    const clean = rows.map((r: any) => {
      const row = pick(r, cols);
      if (cols.includes("org_id")) row.org_id = orgId;
      for (const [col, target] of Object.entries(remaps)) {
        row[col] = remapValue(row[col], target);
      }
      return row;
    });
    // Insert in chunks of 500 to stay under URL/payload limits
    for (let i = 0; i < clean.length; i += 500) {
      const chunk = clean.slice(i, i + 500);
      const { error } = await svc.from(table).insert(chunk);
      if (error) return err(`Failed to restore ${table}: ${error.message}`, 500);
    }
    restoredCounts[table] = clean.length;
  }

  return ok({
    wiped: wipeCounts,
    restored: restoredCounts,
    users: {
      createdAccounts,
      reusedAccounts,
      note: "Restored accounts that had to be recreated use a temporary password — reset them from Admin → Users.",
    },
  });
});
