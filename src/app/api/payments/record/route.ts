import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";

const BILLING_ROLES = ["super_admin", "admin", "accountant"];
const ALLOWED_METHODS = ["cash", "card", "transfer", "bank_transfer", "pos", "insurance", "mobile_money"];

/**
 * POST /api/payments/record
 *
 * Staff records a payment received from a patient (bank transfer, POS, cash…).
 * The amount is allocated across one or more of the patient's invoices
 * (accountant picks the invoices). Each invoice gets a completed payment row
 * and its paid_amount / status is updated. The patient + billing staff are
 * notified automatically.
 *
 * Body: {
 *   patient_id, amount,
 *   payment_method: "bank_transfer" | "pos" | "cash" | ...,
 *   allocation: [{ invoice_id, amount }],   // sum must equal amount
 *   pending_payment_id?,                    // confirms a patient declaration
 *   transaction_ref?, notes?
 * }
 */
export const POST = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase.from("users").select("role, first_name, last_name").eq("id", authUserId).single();
  if (!caller || !BILLING_ROLES.includes(caller.role)) {
    return err("Only admins and accountants can record payments", 403);
  }

  const body = await parseBody<{
    patient_id?: string;
    amount?: number;
    payment_method?: string;
    allocation?: Array<{ invoice_id: string; amount: number }>;
    pending_payment_id?: string;
    transaction_ref?: string;
    notes?: string;
  }>(req);

  if (!body.patient_id || !body.amount || body.amount <= 0) {
    throw new ValidationError("patient_id and a positive amount are required");
  }
  if (!body.payment_method || !ALLOWED_METHODS.includes(body.payment_method)) {
    throw new ValidationError("A valid payment method is required");
  }
  const allocation = (body.allocation || []).filter((a) => a && a.invoice_id && a.amount > 0);
  if (!allocation.length) {
    throw new ValidationError("Allocate the amount to at least one invoice");
  }
  const allocSum = allocation.reduce((s, a) => s + a.amount, 0);
  if (Math.abs(allocSum - body.amount) > 0.01) {
    throw new ValidationError("Allocated amounts must equal the payment amount");
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const svc = createServiceClient();

  // Patient must belong to this org
  const { data: patient } = await svc
    .from("patients")
    .select("id, user_id, user:users(id, first_name, last_name)")
    .eq("id", body.patient_id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!patient) return err("Patient not found", 404);

  const createdPayments = [];
  const updatedInvoices = [];
  const reference = body.transaction_ref?.trim() || `RCPT-${Date.now().toString().slice(-10)}`;

  for (const item of allocation) {
    const { data: invoice } = await svc
      .from("invoices")
      .select("id, invoice_number, total_amount, paid_amount, status")
      .eq("id", item.invoice_id)
      .eq("org_id", orgId)
      .eq("patient_id", body.patient_id)
      .maybeSingle();
    if (!invoice) return err(`Invoice ${item.invoice_id} not found for this patient`, 400);

    const outstanding = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
    if (item.amount > outstanding + 0.01) {
      return err(
        `Allocated ₦${item.amount.toLocaleString()} exceeds outstanding of ₦${outstanding.toLocaleString()} on invoice ${invoice.invoice_number}`,
        400
      );
    }

    const { data: payment, error: payErr } = await svc
      .from("payments")
      .insert({
        org_id: orgId,
        invoice_id: item.invoice_id,
        patient_id: body.patient_id,
        amount: item.amount,
        payment_method: body.payment_method,
        status: "completed",
        transaction_ref: reference,
        notes: body.notes?.trim() || null,
        created_by: authUserId,
      })
      .select()
      .single();
    if (payErr) return err(payErr.message, 500);
    createdPayments.push(payment);

    const newPaid = (invoice.paid_amount || 0) + item.amount;
    const newStatus = newPaid >= invoice.total_amount - 0.01 ? "paid" : "partially_paid";
    const { error: invErr } = await svc
      .from("invoices")
      .update({ paid_amount: newPaid, status: newStatus })
      .eq("id", item.invoice_id);
    if (invErr) return err(invErr.message, 500);
    updatedInvoices.push({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      paid_amount: newPaid,
      status: newStatus,
    });
  }

  // If this confirms a patient declaration, consume the pending row
  let pendingConfirmed = false;
  if (body.pending_payment_id) {
    const { data: pending } = await svc
      .from("payments")
      .select("id")
      .eq("id", body.pending_payment_id)
      .eq("org_id", orgId)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) {
      const { error: delErr } = await svc.from("payments").delete().eq("id", pending.id);
      if (delErr) console.error("[Record] failed to remove pending declaration:", delErr.message);
      else pendingConfirmed = true;
    }
  }

  // ── Notifications (transparency both ways) ──
  const staffName = `${caller.first_name || ""} ${caller.last_name || ""}`.trim() || "Staff";
  const puser = (patient as any).user;
  const patientName = `${puser?.first_name || ""} ${puser?.last_name || ""}`.trim() || "Patient";
  const invNumbers = updatedInvoices.map((i) => i.invoice_number).join(", ");
  const summary = `₦${body.amount.toLocaleString()} recorded for invoice(s) ${invNumbers}.`;

  // 1. Notify the patient
  if (patient.user_id && patient.user_id !== authUserId) {
    await notifyUsers(svc, {
      orgId,
      userIds: [patient.user_id],
      type: "payment_confirmed",
      title: "Payment confirmed",
      message: `${summary} — your account has been settled. Thank you!`,
      referenceType: "payment",
      referenceId: createdPayments[0].id,
      url: "/patient/payments",
      tag: `payment-${createdPayments[0].id}`,
    });
  }

  // 2. Notify the rest of the billing staff (transparency)
  const { data: staff } = await svc
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .in("role", ["super_admin", "admin", "accountant"])
    .eq("is_active", true);
  const otherStaff = (staff || [])
    .map((s: any) => s.id)
    .filter((id: string) => id !== authUserId && id !== patient.user_id);
  if (otherStaff.length) {
    await notifyUsers(svc, {
      orgId,
      userIds: otherStaff,
      type: "payment_confirmed",
      title: "Payment recorded",
      message: `${staffName} recorded ${summary} for ${patientName}.`,
      referenceType: "payment",
      referenceId: createdPayments[0].id,
      url: "/admin/billing",
      tag: `payment-${createdPayments[0].id}`,
    });
  }

  return ok({
    payments: createdPayments,
    invoices: updatedInvoices,
    pendingConfirmed,
  }, 201);
});
