import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/org — org profile (used for invoice headers/print)
export const GET = withAuth(async (req, supabase, authUserId) => {
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const svc = createServiceClient();
  const { data, error } = await svc.from("organizations").select("*").eq("id", orgId).single();
  if (error) return err(error.message, 500);

  const settings = (data?.settings as Record<string, any>) || {};
  return ok({
    id: data.id,
    name: data.name,
    slug: data.slug,
    logo_url: data.logo_url,
    address: settings.address || "",
    phone: settings.phone || "",
    email: settings.email || "",
    website: settings.website || "",
    patientPrefix: settings.patientPrefix || "PT-",
    dependantPrefix: settings.dependantPrefix || "DEP-",
    settings,
  });
});

// PUT /api/org — update org profile (admin/super_admin only)
export const PUT = withAuth(async (req, supabase, authUserId) => {
  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUserId)
    .single();
  if (!caller || !["super_admin", "admin"].includes(caller.role)) {
    return err("Not authorized. Admin role required.", 403);
  }

  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("Org not found", 404);

  const body = await parseBody<{
    name?: string;
    logo_url?: string | null;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    patientPrefix?: string;
    dependantPrefix?: string;
  }>(req);

  const svc = createServiceClient();
  const { data: existing } = await svc.from("organizations").select("settings").eq("id", orgId).single();
  const settings = { ...((existing?.settings as Record<string, any>) || {}) };

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.logo_url !== undefined) updates.logo_url = body.logo_url;
  if (body.address !== undefined) settings.address = body.address;
  if (body.phone !== undefined) settings.phone = body.phone;
  if (body.email !== undefined) settings.email = body.email;
  if (body.website !== undefined) settings.website = body.website;
  if (body.patientPrefix !== undefined) settings.patientPrefix = body.patientPrefix.trim().toUpperCase() || "PT-";
  if (body.dependantPrefix !== undefined) settings.dependantPrefix = body.dependantPrefix.trim().toUpperCase() || "DEP-";
  if (Object.keys(updates).length || body.address !== undefined || body.phone !== undefined || body.email !== undefined || body.website !== undefined
    || body.patientPrefix !== undefined || body.dependantPrefix !== undefined) {
    updates.settings = settings;
  }
  if (!Object.keys(updates).length) throw new ValidationError("No fields to update");

  const { data, error } = await svc
    .from("organizations")
    .update(updates)
    .eq("id", orgId)
    .select("*")
    .single();
  if (error) return err(error.message, 500);

  const newSettings = (data?.settings as Record<string, any>) || {};
  return ok({
    id: data.id,
    name: data.name,
    slug: data.slug,
    logo_url: data.logo_url,
    address: newSettings.address || "",
    phone: newSettings.phone || "",
    email: newSettings.email || "",
    website: newSettings.website || "",
    patientPrefix: newSettings.patientPrefix || "PT-",
    dependantPrefix: newSettings.dependantPrefix || "DEP-",
    settings: newSettings,
  });
});
