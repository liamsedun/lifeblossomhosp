import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id") || await resolvePatientId(supabase, authUserId);
  const status = sp.get("status");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = supabase
    .from("invoices")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*)",
      { count: "exact" });

  if (patientId) query = query.eq("patient_id", patientId);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query.order("issue_date", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    patient_id: string; appointment_id?: string; issue_date?: string; due_date?: string;
    subtotal: number; tax_amount?: number; discount_amount?: number; total_amount: number;
    notes?: string; status?: string;
    items: Array<{ description: string; quantity: number; unit_price: number; total_price: number }>;
  }>(req);

  if (!body.patient_id || body.subtotal === undefined || !body.total_amount) {
    throw new ValidationError("Missing required fields: patient_id, subtotal, total_amount");
  }
  if (!body.items || !body.items.length) {
    throw new ValidationError("At least one invoice item is required");
  }

  // Generate invoice number
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true });
  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, "0")}`;

  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      patient_id: body.patient_id,
      invoice_number: invoiceNumber,
      issue_date: body.issue_date || new Date().toISOString().split("T")[0],
      due_date: body.due_date || null,
      status: body.status || "pending",
      subtotal: body.subtotal,
      tax_amount: body.tax_amount || 0,
      discount_amount: body.discount_amount || 0,
      total_amount: body.total_amount,
      created_by: authUserId,
      notes: body.notes || null,
    })
    .select("id")
    .single();

  if (invError) return err(invError.message, 500);

  // Insert items
  const lineItems = body.items.map((it) => ({ ...it, invoice_id: invoice.id }));
  const { data: items, error: itemsError } = await supabase.from("invoice_items").insert(lineItems).select();
  if (itemsError) return err(itemsError.message, 500);

  // Fetch full invoice
  const { data: full } = await supabase
    .from("invoices")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*)")
    .eq("id", invoice.id).single();

  return ok({ ...full, items }, 201);
});
