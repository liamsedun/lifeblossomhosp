import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId, resolveOrgId, paymentDeniedReason } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const invoiceId = sp.get("invoice_id");
  const patientId = sp.get("patient_id") || await resolvePatientId(supabase, authUserId);
  const status = sp.get("status");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = supabase
    .from("payments")
    .select("*, invoice:invoices(*), patient:patients(*, user:users(id, first_name, last_name))",
      { count: "exact" });

  if (invoiceId) query = query.eq("invoice_id", invoiceId);
  if (patientId) query = query.eq("patient_id", patientId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query.order("payment_date", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    invoice_id: string; patient_id: string; amount: number;
    payment_method: string; transaction_ref?: string; notes?: string;
  }>(req);

  if (!body.invoice_id || !body.patient_id || !body.amount || !body.payment_method) {
    throw new ValidationError("Missing required fields: invoice_id, patient_id, amount, payment_method");
  }

  // Family payment rule: staff or main account holder (self + dependants) only
  const denied = await paymentDeniedReason(supabase, authUserId, body.patient_id);
  if (denied) return err(denied.error, denied.status);

  const svc = createServiceClient();

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — org could not be resolved", 404);

  const { data, error } = await svc
    .from("payments")
    .insert({
      org_id: orgId,
      invoice_id: body.invoice_id,
      patient_id: body.patient_id,
      amount: body.amount,
      payment_method: body.payment_method,
      transaction_ref: body.transaction_ref || null,
      notes: body.notes || null,
      created_by: authUserId,
      status: "completed",
    })
    .select("*, invoice:invoices(*), patient:patients(*, user:users(id, first_name, last_name))")
    .single();

  if (error) return err(error.message, 500);

  // Update invoice paid_amount
  const { data: invoice } = await supabase.from("invoices").select("paid_amount, total_amount").eq("id", body.invoice_id).single();
  if (invoice) {
    const newPaid = (invoice.paid_amount || 0) + body.amount;
    const newStatus = newPaid >= invoice.total_amount ? "paid" : "partially_paid";
    await svc.from("invoices").update({ paid_amount: newPaid, status: newStatus }).eq("id", body.invoice_id);
  }

  return ok(data, 201);
});
