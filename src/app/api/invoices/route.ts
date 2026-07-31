import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const svc = createServiceClient();
  const sp = new URL(req.url).searchParams;
  const patientId = sp.get("patient_id") || await resolvePatientId(supabase, authUserId);
  const status = sp.get("status");
  const { page, pageSize, from, to } = getPagination(sp);

  let query = svc
    .from("invoices")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*), attending_staff:attending_staff_id(id, first_name, last_name, role, avatar_url)",
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
    attending_staff_id?: string; notes?: string; status?: string;
    items: Array<{ description: string; quantity: number; unit_price: number; total_price: number; vat_percent?: number; vat_amount?: number }>;
  }>(req);

  if (!body.patient_id || body.subtotal === undefined || !body.total_amount) {
    throw new ValidationError("Missing required fields: patient_id, subtotal, total_amount");
  }
  if (!body.items || !body.items.length) {
    throw new ValidationError("At least one invoice item is required");
  }

  const svc = createServiceClient();

  // Generate invoice number
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true });
  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, "0")}`;

  // Validate attending staff belongs to this org (if provided)
  if (body.attending_staff_id) {
    const { data: staffUser } = await svc
      .from("users")
      .select("id, role")
      .eq("id", body.attending_staff_id)
      .maybeSingle();
    if (!staffUser) return err("Attending staff not found", 400);
    if (!["doctor", "nurse", "admin", "super_admin", "accountant"].includes(staffUser.role)) {
      return err("Attending staff must be a doctor, nurse, admin, accountant, or super admin", 400);
    }
  }

  const { data: invoice, error: invError } = await svc
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
      attending_staff_id: body.attending_staff_id || null,
      created_by: authUserId,
      notes: body.notes || null,
    })
    .select("id")
    .single();

  if (invError) return err(invError.message, 500);

  // Insert items
  const lineItems = body.items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    vat_percent: it.vat_percent || 0,
    vat_amount: it.vat_amount || 0,
    total_price: it.total_price,
    invoice_id: invoice.id,
  }));
  const { data: items, error: itemsError } = await svc.from("invoice_items").insert(lineItems).select();
  if (itemsError) return err(itemsError.message, 500);

  // Fetch full invoice
  const { data: full } = await svc
    .from("invoices")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*), attending_staff:attending_staff_id(id, first_name, last_name, role, avatar_url)")
    .eq("id", invoice.id).single();

  return ok({ ...full, items }, 201);
});
