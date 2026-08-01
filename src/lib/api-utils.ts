import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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

// ─── Family payment authorization ───────────────────────────────

const PAYMENT_STAFF_ROLES = ["super_admin", "admin", "accountant"];

export interface PaymentAccess {
  /** The caller's own patients row (if they are a patient). */
  patientId: string | null;
  /** True if the caller is a dependant (linked to a primary account). */
  isDependant: boolean;
  /** The caller's primary account id when they are a dependant. */
  primaryAccountId: string | null;
  isStaff: boolean;
}

/**
 * Resolve how the caller relates to family payments:
 * - staff (super_admin/admin/accountant) may pay for anyone in the org
 * - a primary patient may pay for themselves and their dependants
 * - a dependant may NOT make payments at all (main account holder pays)
 */
export async function resolvePaymentAccess(
  supabase: SupabaseClient,
  authUserId: string
): Promise<PaymentAccess> {
  const svc = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUserId)
    .single();

  const role = user?.role;
  if (!role || !["patient", "super_admin", "admin", "accountant", "doctor", "nurse"].includes(role)) {
    return { patientId: null, isDependant: false, primaryAccountId: null, isStaff: false };
  }

  if (role !== "patient") {
    return {
      patientId: null,
      isDependant: false,
      primaryAccountId: null,
      isStaff: PAYMENT_STAFF_ROLES.includes(role),
    };
  }

  const { data: patient } = await svc
    .from("patients")
    .select("id, primary_account_id")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (!patient) return { patientId: null, isDependant: false, primaryAccountId: null, isStaff: false };

  return {
    patientId: patient.id,
    isDependant: Boolean(patient.primary_account_id),
    primaryAccountId: patient.primary_account_id || null,
    isStaff: false,
  };
}

/**
 * Check whether the caller may create a payment for the given patient.
 * Returns an error message (with HTTP status) or null when allowed.
 */
export async function paymentDeniedReason(
  supabase: SupabaseClient,
  authUserId: string,
  targetPatientId: string
): Promise<{ error: string; status: number } | null> {
  const access = await resolvePaymentAccess(supabase, authUserId);

  if (access.isStaff) return null;

  if (!access.patientId) {
    return { error: "You are not allowed to make payments", status: 403 };
  }

  // Dependants cannot pay at all — the main account holder pays on their behalf
  if (access.isDependant) {
    return {
      error: "Only the main account holder can make payments on your behalf",
      status: 403,
    };
  }

  // Primary account holder: may pay for themselves or their own dependants
  if (targetPatientId === access.patientId) return null;

  const svc = createServiceClient();
  const { data: target } = await svc
    .from("patients")
    .select("primary_account_id")
    .eq("id", targetPatientId)
    .maybeSingle();

  if (target && target.primary_account_id === access.patientId) return null;

  return {
    error: "You can only make payments for yourself or your dependants",
    status: 403,
  };
}
