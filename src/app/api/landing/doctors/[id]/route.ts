import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";

export const PUT = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const body = await parseBody<{
    name?: string;
    specialty?: string;
    available?: boolean;
    availability?: string;
    image_url?: string | null;
    sort_order?: number;
    is_active?: boolean;
  }>(req);

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.specialty !== undefined) updates.specialty = body.specialty.trim();
  if (body.available !== undefined) updates.available = body.available;
  if (body.availability !== undefined) updates.availability = body.availability;
  if (body.image_url !== undefined) updates.image_url = body.image_url;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) return err("No fields to update", 400);

  const { data, error } = await supabase
    .from("landing_doctors")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  if (!data) return err("Doctor not found", 404);
  return ok(data);
});

export const DELETE = withAuth(async (req, supabase, authUserId, context) => {
  const { id } = await context.params;

  const { error, count } = await supabase
    .from("landing_doctors")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return err(error.message, 500);
  if (count === 0) return err("Doctor not found", 404);
  return ok({ deleted: true });
});
