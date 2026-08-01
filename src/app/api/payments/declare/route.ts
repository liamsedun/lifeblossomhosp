import { NextRequest } from "next/server";
import {
  withAuth, ok, err, parseBody, ValidationError,
  resolvePatientId, resolveOrgId,
} from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";

/**
 * POST /api/payments/declare
 *
 * Patient marks a bank transfer as completed for an invoice.
 * Creates a pending payment row and pushes a notification to every
 * admin / super admin / accountant in the org so they can confirm it
 * in Billing → Record Payment.
 *
 * Body: { invoice_id, amount } (amount in Naira)
 */
export const POST = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role, first_name, last_name").eq("id", authUserId).single();
  if (caller?.role !== "patient") return err("Only patients can declare a transfer", 403);

  const body = await parseBody<{ invoice_id?: string; amount?: number }>(req);
  if (!body.invoice_id || !body.amount || body.amount <= 0) {
    throw new ValidationError("invoice_id and a positive amount are required");
  }

  const patientId = await resolvePatientId(supabase, authUserId);
  if (!patientId) return err("Patient profile not found", 404);

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const svc = createServiceClient();

  // Invoice must belong to this patient and still be payable
  const { data: invoice } = await svc
    .from("invoices")
    .select("id, invoice_number, total_amount, paid_amount, status")
    .eq("id", body.invoice_id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!invoice) return err("Invoice not found", 404);
  if (invoice.status === "paid") return err("Invoice already paid", 400);
  const outstanding = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
  if (outstanding <= 0) return err("Invoice is fully paid", 400);
  if (body.amount > outstanding) {
    return err(`Amount exceeds outstanding balance of ₦${outstanding.toLocaleString()}`, 400);
  }

  // Prevent duplicate declarations for the same invoice
  const { data: dup } = await svc
    .from("payments")
    .select("id")
    .eq("org_id", orgId)
    .eq("patient_id", patientId)
    .eq("invoice_id", body.invoice_id)
    .eq("status", "pending")
    .maybeSingle();
  if (dup) return err("You already have a pending transfer declaration for this invoice", 400);

  const reference = `TRF-${Date.now().toString().slice(-10)}`;
  const { data: payment, error } = await svc
    .from("payments")
    .insert({
      org_id: orgId,
      invoice_id: body.invoice_id,
      patient_id: patientId,
      amount: body.amount,
      payment_method: "bank_transfer",
      status: "pending",
      transaction_ref: reference,
      notes: "Declared by patient — awaiting staff confirmation",
      created_by: authUserId,
    })
    .select()
    .single();
  if (error) return err(error.message, 500);

  // Notify every billing staff member in the org
  const { data: staff } = await svc
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .in("role", ["super_admin", "admin", "accountant"])
    .eq("is_active", true);
  const staffIds = (staff || []).map((s: any) => s.id).filter((id: string) => id !== authUserId);

  const patientName = caller.first_name
    ? `${caller.first_name} ${caller.last_name || ""}`.trim()
    : "A patient";
  await notifyUsers(svc, {
    orgId,
    userIds: staffIds,
    type: "payment_declared",
    title: "New bank transfer declared",
    message: `${patientName} declared ₦${body.amount.toLocaleString()} for invoice ${invoice.invoice_number} — confirm in Billing → Record Payment.`,
    referenceType: "payment",
    referenceId: payment.id,
    url: "/admin/billing",
    tag: `payment-${payment.id}`,
  });

  return ok(payment, 201);
});
