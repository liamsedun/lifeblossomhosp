import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";

const ALLOWED_CATEGORIES = [
  "donation", "food_sales", "drink_sales", "drug_sales", "consumables", "other",
];

export const GET = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("other_income")
    .select("*, created_by_user:users!other_income_created_by_fkey(id, first_name, last_name)")
    .eq("id", id).single();
  if (error || !data) return err("Not found", 404);
  return ok(data);
});

export const PUT = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const body = await parseBody<any>(req);

  const { data: existing } = await supabase.from("other_income").select("id, org_id").eq("id", id).single();
  if (!existing) return err("Not found", 404);

  const allowed = ["description", "category", "amount", "income_date", "payment_method", "source", "notes"];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  if (updates.category && !ALLOWED_CATEGORIES.includes(updates.category)) {
    return err(`Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("other_income").update(updates).eq("id", id)
    .select("*, created_by_user:users!other_income_created_by_fkey(id, first_name, last_name)")
    .single();
  if (error) return err(error.message, 500);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, _uid, context) => {
  const { id } = await context.params;
  const { data: existing } = await supabase.from("other_income").select("id").eq("id", id).single();
  if (!existing) return err("Not found", 404);
  const { error } = await supabase.from("other_income").delete().eq("id", id);
  if (error) return err(error.message, 500);
  return ok(null);
});
