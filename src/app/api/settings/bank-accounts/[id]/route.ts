import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

const MANAGER_ROLES = ["super_admin", "accountant"];

async function loadAccount(svc: any, orgId: string, accountId: string) {
  const { data, error } = await svc
    .from("hospital_bank_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!data) throw Object.assign(new Error("Bank account not found"), { status: 404 });
  return data;
}

// PUT /api/settings/bank-accounts/:id
export const PUT = withAuth(async (req, supabase, authUserId, ctx) => {
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || !MANAGER_ROLES.includes(caller.role)) {
    return err("Only super admins and accountants can manage bank accounts", 403);
  }

  const { id: accountId } = await ctx.params;
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const body = await parseBody<{
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    is_active?: boolean;
  }>(req);

  const svc = createServiceClient();
  await loadAccount(svc, orgId, accountId);

  const patch: Record<string, any> = {};
  if (body.bank_name !== undefined) {
    const v = (body.bank_name || "").trim();
    if (!v) throw new ValidationError("Bank name cannot be empty");
    patch.bank_name = v;
  }
  if (body.account_name !== undefined) {
    const v = (body.account_name || "").trim();
    if (!v) throw new ValidationError("Account name cannot be empty");
    patch.account_name = v;
  }
  if (body.account_number !== undefined) {
    const v = (body.account_number || "").trim();
    if (!/^[0-9]{10}$/.test(v)) throw new ValidationError("Account number must be exactly 10 digits");
    patch.account_number = v;
  }
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  patch.updated_at = new Date().toISOString();

  const { data, error } = await svc
    .from("hospital_bank_accounts")
    .update(patch)
    .eq("id", accountId)
    .eq("org_id", orgId)
    .select()
    .single();
  if (error) return err(error.message, 500);

  return ok(data);
});

// DELETE /api/settings/bank-accounts/:id
export const DELETE = withAuth(async (req, supabase, authUserId, ctx) => {
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  if (!caller || !MANAGER_ROLES.includes(caller.role)) {
    return err("Only super admins and accountants can manage bank accounts", 403);
  }

  const { id: accountId } = await ctx.params;
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const svc = createServiceClient();
  await loadAccount(svc, orgId, accountId);

  const { error } = await svc
    .from("hospital_bank_accounts")
    .delete()
    .eq("id", accountId)
    .eq("org_id", orgId);
  if (error) return err(error.message, 500);

  return ok({ success: true });
});
