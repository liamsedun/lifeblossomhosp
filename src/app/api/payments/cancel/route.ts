import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

const BILLING_ROLES = ["super_admin", "admin", "accountant"];

/**
 * POST /api/payments/cancel
 *
 * Staff cancels a patient's pending bank transfer / POS declaration when
 * the transfer did not go through or the payment could not be confirmed.
 * The pending row is marked 'cancelled' (kept for audit) and the patient
 * is notified so they know the declaration was not accepted.
 *
 * Body: { pending_payment_id }
 */
export const POST = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase
    .from("users")
    .select("role, first_name, last_name")
    .eq("id", authUserId)
    .single();
  if (!caller || !BILLING_ROLES.includes(caller.role)) {
    return err("Only admins and accountants can cancel pending declarations", 403);
  }

  const body = await parseBody<{ pending_payment_id?: string }>(req);
  if (!body.pending_payment_id) {
    throw new ValidationError("pending_payment_id is required");
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const svc = createServiceClient();

  const { data: payment } = await svc
    .from("payments")
    .select(
      "id, invoice_id, patient_id, amount, transaction_ref, payment_method, invoice:invoices(invoice_number)"
    )
    .eq("id", body.pending_payment_id)
    .eq("org_id", orgId)
    .eq("status", "pending")
    .maybeSingle();
  if (!payment) return err("Pending declaration not found", 404);

  const staffName = `${caller.first_name || ""} ${caller.last_name || ""}`.trim() || "Staff";
  const { error: updErr } = await svc
    .from("payments")
    .update({
      status: "cancelled",
      notes: `Cancelled by ${staffName} — transfer not confirmed`,
    })
    .eq("id", payment.id);
  if (updErr) return err(updErr.message, 500);

  const methodLabel = payment.payment_method === "pos" ? "POS payment" : "bank transfer";
  const refText = payment.transaction_ref ? ` (Ref ${payment.transaction_ref})` : "";
  const invoiceRow = Array.isArray(payment.invoice) ? (payment.invoice as any[])[0] : payment.invoice;
  const invText = invoiceRow?.invoice_number || "your invoice";

  // Notify the patient
  const { data: patient } = await svc
    .from("patients")
    .select("user_id")
    .eq("id", payment.patient_id)
    .maybeSingle();
  if (patient?.user_id && patient.user_id !== authUserId) {
    await notifyUsers(svc, {
      orgId,
      userIds: [patient.user_id],
      type: "payment_cancelled",
      title: "Payment declaration cancelled",
      message: `Your ${methodLabel} of ₦${Number(payment.amount || 0).toLocaleString()}${refText} for ${invText} could not be confirmed and was cancelled. If you completed the payment, please contact the hospital.`,
      referenceType: "payment",
      referenceId: payment.id,
      url: "/patient/payments",
      tag: `payment-${payment.id}`,
    });
  }

  // Notify the rest of the billing staff (transparency)
  const { data: staff } = await svc
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .in("role", ["super_admin", "admin", "accountant"])
    .eq("is_active", true);
  const otherStaff = (staff || [])
    .map((s: any) => s.id)
    .filter((id: string) => id !== authUserId && id !== patient?.user_id);
  if (otherStaff.length) {
    const pname = await svc
      .from("patients")
      .select("user:users(first_name, last_name)")
      .eq("id", payment.patient_id)
      .maybeSingle();
    const puser = (pname as any)?.user as any;
    const patientName = `${puser?.first_name || ""} ${puser?.last_name || ""}`.trim() || "Patient";
    await notifyUsers(svc, {
      orgId,
      userIds: otherStaff,
      type: "payment_cancelled",
      title: "Declaration cancelled",
      message: `${staffName} cancelled ${patientName}'s pending ${methodLabel} of ₦${Number(payment.amount || 0).toLocaleString()}${refText} for ${invText}.`,
      referenceType: "payment",
      referenceId: payment.id,
      url: "/admin/billing",
      tag: `payment-${payment.id}`,
    });
  }

  await logAudit(req, authUserId, { action: "update", entityType: "payments", entityId: payment.id, description: `Cancelled pending ${methodLabel} of ₦${Number(payment.amount || 0).toLocaleString()}${refText} for ${invText}` });

  return ok({ id: payment.id, status: "cancelled" });
});
