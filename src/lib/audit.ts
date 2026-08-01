import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Server-side audit & security layer.
 *
 * Writes go through the SERVICE ROLE client (bypasses RLS) so audit logging
 * can never be blocked or spoofed by client-side policies, and audit_logs /
 * security_events are append-only at the DB level (no RLS insert policies;
 * triggers use SECURITY DEFINER).
 */

export type AuditAction = "create" | "update" | "delete" | "view" | "login" | "logout";

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  changes?: Record<string, unknown> | null;
}

/** Best-effort client metadata extraction from the request. */
export function getClientMeta(req: NextRequest): { ip_address: string; user_agent: string | null } {
  const fwd = req.headers.get("x-forwarded-for");
  const vercel = req.headers.get("x-vercel-forwarded-for");
  const ip = (fwd?.split(",")[0] || vercel?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
  return { ip_address: ip, user_agent: req.headers.get("user-agent") };
}

async function resolveUser(userId: string): Promise<{ id: string; org_id: string | null; role: string | null } | null> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("users")
      .select("id, org_id, role")
      .eq("id", userId)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

/**
 * Write an audit_logs row. Never throws — audit logging must never break the
 * request it is logging. Uses the service client so it works for every role.
 */
export async function logAudit(
  req: NextRequest,
  userId: string,
  entry: AuditEntry
): Promise<void> {
  try {
    const user = await resolveUser(userId);
    if (!user) return;
    const svc = createServiceClient();
    const meta = getClientMeta(req);
    await svc.from("audit_logs").insert({
      org_id: user.org_id,
      user_id: user.id,
      role: user.role,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      description: entry.description || null,
      changes: entry.changes || null,
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
    });
  } catch (e) {
    console.error("[audit] failed to write log:", e);
  }
}

/** Convenience for read-tracking (VIEW) on sensitive data. */
export async function logView(
  req: NextRequest,
  userId: string,
  entityType: string,
  entityId: string | null,
  description?: string
): Promise<void> {
  await logAudit(req, userId, { action: "view", entityType, entityId, description });
  await detectRapidView(userId, entityType, entityId);
}

/**
 * Anomaly detection: >8 VIEWs of the same record by the same user within 5
 * minutes → high-severity security event (possible scraping / snooping).
 */
async function detectRapidView(userId: string, entityType: string, entityId: string | null): Promise<void> {
  try {
    const user = await resolveUser(userId);
    if (!user || !entityId) return;
    const svc = createServiceClient();
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { count } = await svc
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", user.org_id)
      .eq("user_id", userId)
      .eq("action", "view")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .gte("created_at", since);

    if ((count || 0) >= 8) {
      await svc.from("security_events").insert({
        org_id: user.org_id,
        user_id: userId,
        event_type: "rapid_view",
        severity: "high",
        description: `${count} rapid VIEWs of ${entityType} ${entityId} within 5 minutes`,
      });
    }
  } catch (e) {
    console.error("[audit] rapid-view check failed:", e);
  }
}

/** Write a security_events row (anomaly tracking). Never throws. */
export async function flagSecurityEvent(
  req: NextRequest,
  userId: string | null,
  eventType: string,
  severity: "info" | "warning" | "high" | "critical",
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    let orgId: string | null = null;
    if (userId) {
      const user = await resolveUser(userId);
      orgId = user?.org_id ?? null;
    }
    const svc = createServiceClient();
    const meta = getClientMeta(req);
    await svc.from("security_events").insert({
      org_id: orgId,
      user_id: userId,
      event_type: eventType,
      severity,
      description,
      metadata: metadata || null,
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
    });
  } catch (e) {
    console.error("[audit] failed to record security event:", e);
  }
}

/** Failed-login tracking + brute-force lockout. Returns true if locked out. */
export async function checkLoginLockout(
  req: NextRequest,
  identifier: string
): Promise<boolean> {
  const svc = createServiceClient();
  const meta = getClientMeta(req);
  const since = new Date(Date.now() - 15 * 60_000).toISOString();

  const { count } = await svc
    .from("security_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "failed_login")
    .eq("ip_address", meta.ip_address)
    .eq("metadata->>identifier", identifier)
    .gte("created_at", since);

  return (count || 0) >= 5;
}

/** Record a failed login attempt as a security event. */
export async function recordLoginFailure(
  req: NextRequest,
  identifier: string,
  reason: string
): Promise<void> {
  try {
    const svc = createServiceClient();
    const meta = getClientMeta(req);
    await svc.from("security_events").insert({
      org_id: null,
      user_id: null,
      event_type: "failed_login",
      severity: "warning",
      description: `Failed login for "${identifier}": ${reason}`,
      metadata: { identifier },
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
    });
  } catch (e) {
    console.error("[audit] failed to record login failure:", e);
  }
}

/** Record a successful login/logout in the audit trail. */
export async function logAuth(
  req: NextRequest,
  userId: string,
  action: "login" | "logout"
): Promise<void> {
  await logAudit(req, userId, {
    action,
    entityType: "auth",
    entityId: null,
    description: action === "login" ? "User signed in" : "User signed out",
  });
}
