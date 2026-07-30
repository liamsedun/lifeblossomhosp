import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolveOrgId } from "@/lib/api-utils";

const ALLOWED_CATEGORIES = [
  "donation", "food_sales", "drink_sales", "drug_sales", "consumables", "other",
];

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const category = sp.get("category");
  const fromDate = sp.get("from");
  const toDate = sp.get("to");
  const search = sp.get("search");
  const { page, pageSize, from, to } = getPagination(sp);

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found", 404);

  let query = supabase
    .from("other_income")
    .select("*, created_by_user:users!other_income_created_by_fkey(id, first_name, last_name)", { count: "exact" })
    .eq("org_id", orgId);

  if (category) query = query.eq("category", category);
  if (fromDate) query = query.gte("income_date", fromDate);
  if (toDate) query = query.lte("income_date", toDate);
  if (search) {
    query = query.or(`description.ilike.%${search}%,source.ilike.%${search}%`);
  }

  const { data, error, count } = await query.order("income_date", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    description: string; category: string; amount: number; income_date: string;
    payment_method?: string; source?: string; notes?: string;
  }>(req);

  if (!body.description || !body.category || body.amount === undefined || !body.income_date) {
    throw new ValidationError("Missing required fields: description, category, amount, income_date");
  }
  if (!ALLOWED_CATEGORIES.includes(body.category)) {
    throw new ValidationError(`Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found", 404);

  const { data, error } = await supabase
    .from("other_income")
    .insert({
      org_id: orgId,
      description: body.description,
      category: body.category,
      amount: body.amount,
      income_date: body.income_date,
      payment_method: body.payment_method || "cash",
      source: body.source || null,
      notes: body.notes || null,
      created_by: authUserId,
    })
    .select("*, created_by_user:users!other_income_created_by_fkey(id, first_name, last_name)")
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
