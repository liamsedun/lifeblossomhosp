import { NextRequest } from "next/server";
import { withAuth, ok, err, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/billing/summary?month=YYYY-MM
 *
 * Period summary for the Billing dashboard cards. Computes everything on
 * the server (no pagination limits) for the given calendar month, which
 * defaults to the current month when omitted.
 *
 * Returns:
 *   {
 *     month,                 // "YYYY-MM"
 *     collectedRevenue,      // completed payments received in the period
 *     outstanding,           // unpaid balance of invoices raised in the period
 *     invoicedTotal,         // sum of invoice totals raised in the period
 *     invoiceCount,          // number of invoices raised in the period
 *   }
 */
export const GET = withAuth(async (req, supabase, authUserId) => {
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const sp = new URL(req.url).searchParams;
  let month = (sp.get("month") || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date();
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const svc = createServiceClient();

  // Collected revenue — completed payments received within the period
  let collectedRevenue = 0;
  const { data: payments, error: payErr } = await svc
    .from("payments")
    .select("amount")
    .eq("org_id", orgId)
    .eq("status", "completed")
    .gte("payment_date", startIso)
    .lt("payment_date", endIso);
  if (payErr) return err(payErr.message, 500);
  for (const p of payments ?? []) collectedRevenue += Number(p.amount || 0);

  // Invoices raised within the period
  const { data: invoices, error: invErr } = await svc
    .from("invoices")
    .select("total_amount, paid_amount, status")
    .eq("org_id", orgId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (invErr) return err(invErr.message, 500);

  let invoicedTotal = 0;
  let invoiceCount = 0;
  let outstanding = 0;
  for (const inv of invoices ?? []) {
    if (inv.status === "draft" || inv.status === "cancelled" || inv.status === "refunded") continue;
    invoicedTotal += Number(inv.total_amount || 0);
    invoiceCount += 1;
    if (inv.status === "pending" || inv.status === "partially_paid") {
      outstanding += Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
    }
  }

  return ok({
    month,
    collectedRevenue: Math.round(collectedRevenue * 100) / 100,
    outstanding: Math.round(outstanding * 100) / 100,
    invoicedTotal: Math.round(invoicedTotal * 100) / 100,
    invoiceCount,
  });
});
