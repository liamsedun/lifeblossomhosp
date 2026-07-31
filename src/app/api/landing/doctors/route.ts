import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_ORG_ID = "a0000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("landing_doctors")
      .select("*")
      .eq("org_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return err(error.message, 500);
    return ok(data);
  } catch (e: any) {
    console.error("[Landing Doctors GET]", e);
    return err("Internal server error", 500);
  }
}

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    name: string;
    specialty: string;
    available?: boolean;
    availability?: string;
    image_url?: string;
    sort_order?: number;
  }>(req);

  const name = body.name?.trim();
  if (!name) return err("Name is required", 400);
  if (!body.specialty?.trim()) return err("Specialty is required", 400);

  const svc = createServiceClient();
  const orgResult = await svc
    .from("users")
    .select("org_id")
    .eq("id", authUserId)
    .single();

  const orgId = orgResult.data?.org_id || DEFAULT_ORG_ID;

  const { data, error } = await svc
    .from("landing_doctors")
    .insert({
      org_id: orgId,
      name,
      specialty: body.specialty.trim(),
      available: body.available ?? true,
      availability: body.availability ?? "",
      image_url: body.image_url ?? null,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
