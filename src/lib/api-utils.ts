import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Response helpers ───────────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function paginated<T>(data: T[], total: number, page: number, pageSize: number) {
  return NextResponse.json({
    success: true,
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export function err(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

// ─── Custom errors ──────────────────────────────────────────────

export class AuthError extends Error {
  constructor(m = "Not authenticated") { super(m); this.name = "AuthError"; }
}
export class NotFoundError extends Error {
  constructor(m = "Not found") { super(m); this.name = "NotFoundError"; }
}
export class ValidationError extends Error {
  fields?: Record<string, string>;
  constructor(m: string, f?: Record<string, string>) { super(m); this.name = "ValidationError"; this.fields = f; }
}

// ─── Body parsing ───────────────────────────────────────────────

export async function parseBody<T>(req: NextRequest): Promise<T> {
  try { return await req.json(); }
  catch { throw new ValidationError("Invalid JSON body"); }
}

// ─── Pagination ─────────────────────────────────────────────────

export function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || "20", 10) || 20));
  return { page, pageSize, from: (page - 1) * pageSize, to: (page - 1) * pageSize + pageSize - 1 };
}

// ─── Auth wrapper — wraps any route handler with auth + error handling ──

type Handler = (req: NextRequest, supabase: SupabaseClient, authUserId: string, context?: any) => Promise<NextResponse>;

export function withAuth(handler: Handler) {
  return async (req: NextRequest, context?: any) => {
    try {
      const supabase = await createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) return err("Not authenticated", 401);
      return await handler(req, supabase, authUser.id, context);
    } catch (e: any) {
      if (e instanceof AuthError) return err(e.message, 401);
      if (e instanceof NotFoundError) return err(e.message, 404);
      if (e instanceof ValidationError) return err(e.message, 400);
      console.error("[API]", e);
      return err("Internal server error", 500);
    }
  };
}

/**
 * Resolve the org_id of the calling user.
 * Tries the authenticated (RLS) client first, falls back to the
 * service-role client so the call succeeds even if the public.users
 * row is temporarily invisible due to RLS.
 */
import { createServiceClient } from "@/lib/supabase/server";

export async function resolveOrgId(supabase: SupabaseClient, authUserId: string): Promise<string | null> {
  const { data: p } = await supabase.from("users").select("org_id").eq("id", authUserId).maybeSingle();
  if (p) return p.org_id;
  const svc = createServiceClient();
  const { data: s } = await svc.from("users").select("org_id").eq("id", authUserId).maybeSingle();
  return s?.org_id ?? null;
}

/** Resolve a param that may be a string or Promise<string> (Next.js App Router pattern). */
export async function resolveParam(p: string | Promise<string>): Promise<string> {
  return typeof p === "string" ? p : await p;
}

/**
 * For patient-role callers, resolve their `patients.id` so API routes can
 * auto-scope queries. Returns `null` for non-patient roles or if not found.
 */
export async function resolvePatientId(
  supabase: SupabaseClient,
  authUserId: string
): Promise<string | null> {
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUserId)
    .single();

  if (!user || user.role !== "patient") return null;

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", authUserId)
    .maybeSingle();

  return patient?.id ?? null;
}
