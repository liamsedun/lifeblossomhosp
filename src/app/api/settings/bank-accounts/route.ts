import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const MAX_BANK_ACCOUNTS = 5;
const MANAGER_ROLES = ["super_admin", "accountant"];

// GET /api/settings/bank-accounts
//   Super admin / accountant → all accounts for the org
//   Patient                  → only active accounts (shown in the payment popup)
export const GET = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const isManager = caller && MANAGER_ROLES.includes(caller.role);
  if (!isManager && caller?.role !== "patient") {
    return err("Not authorized", 403);
  }

  const svc = createServiceClient();
  let query = svc.from("hospital_bank_accounts").select("*").eq("org_id", orgId);
  if (!isManager) query = query.eq("is_active", true);
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) return err(error.message, 500);

  return ok({ accounts: data || [], max: MAX_BANK_ACCOUNTS, canManage: !!isManager });
});

// POST /api/settings/bank-accounts — add a hospital bank account (max 5)
export const POST = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || !MANAGER_ROLES.includes(caller.role)) {
    return err("Only super admins and accountants can manage bank accounts", 403);
  }

  const body = await parseBody<{
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    is_active?: boolean;
  }>(req);

  const bankName = (body.bank_name || "").trim();
  const accountName = (body.account_name || "").trim();
  const accountNumber = (body.account_number || "").trim();
  if (!bankName || !accountName || !accountNumber) {
    throw new ValidationError("Bank name, account name and account number are required");
  }
  if (!/^[0-9]{10}$/.test(accountNumber)) {
    throw new ValidationError("Account number must be exactly 10 digits");
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const svc = createServiceClient();
  const { count } = await svc
    .from("hospital_bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  if ((count || 0) >= MAX_BANK_ACCOUNTS) {
    return err(`Maximum of ${MAX_BANK_ACCOUNTS} bank accounts allowed`, 400);
  }

  const { data, error } = await svc
    .from("hospital_bank_accounts")
    .insert({
      org_id: orgId,
      bank_name: bankName,
      account_name: accountName,
      account_number: accountNumber,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();
  if (error) return err(error.message, 500);

  return ok(data, 201);
});
