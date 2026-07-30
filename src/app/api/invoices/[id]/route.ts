import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("invoices")
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*)")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase.from("invoices").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["status", "due_date", "notes", "subtotal", "tax_amount", "discount_amount", "total_amount", "paid_amount"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];

  if (body.items && Array.isArray(body.items)) {
    await supabase.from("invoice_items").delete().eq("invoice_id", id);
    const newItems = body.items.map((it: any) => ({ ...it, invoice_id: id }));
    await supabase.from("invoice_items").insert(newItems);
  }

  const { data, error } = await supabase.from("invoices").update(updates).eq("id", id)
    .select("*, patient:patients(*, user:users(id, first_name, last_name)), items:invoice_items(*), payments:payments(*)")
    .single();
  if (error) return err(error.message, 500);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data: existing } = await supabase.from("invoices").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return err(error.message, 500);
  return ok(null);
});
