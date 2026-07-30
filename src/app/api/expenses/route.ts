import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError } from "@/lib/api-utils";

const ALLOWED_CATEGORIES = [
  "utilities", "rent", "salaries", "medical_supplies", "equipment",
  "maintenance", "transport", "staff_welfare", "training", "other",
];

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const category = sp.get("category");
  const fromDate = sp.get("from");
  const toDate = sp.get("to");
  const search = sp.get("search");
  const { page, pageSize, from, to } = getPagination(sp);

  const { data: caller } = await supabase.from("users").select("org_id").eq("id", authUserId).single();
  if (!caller) return err("User not found", 404);

  let query = supabase
    .from("expenses")
    .select("*, created_by_user:users!expenses_created_by_fkey(id, first_name, last_name)", { count: "exact" })
    .eq("org_id", caller.org_id);

  if (category) query = query.eq("category", category);
  if (fromDate) query = query.gte("expense_date", fromDate);
  if (toDate) query = query.lte("expense_date", toDate);
  if (search) {
    query = query.or(`description.ilike.%${search}%,vendor.ilike.%${search}%`);
  }

  const { data, error, count } = await query.order("expense_date", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    description: string; category: string; amount: number; expense_date: string;
    payment_method?: string; vendor?: string; notes?: string;
  }>(req);

  if (!body.description || !body.category || body.amount === undefined || !body.expense_date) {
    throw new ValidationError("Missing required fields: description, category, amount, expense_date");
  }
  if (!ALLOWED_CATEGORIES.includes(body.category)) {
    throw new ValidationError(`Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }

  const { data: caller } = await supabase.from("users").select("org_id").eq("id", authUserId).single();
  if (!caller) return err("User not found", 404);

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      org_id: caller.org_id,
      description: body.description,
      category: body.category,
      amount: body.amount,
      expense_date: body.expense_date,
      payment_method: body.payment_method || "cash",
      vendor: body.vendor || null,
      notes: body.notes || null,
      created_by: authUserId,
    })
    .select("*, created_by_user:users!expenses_created_by_fkey(id, first_name, last_name)")
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
