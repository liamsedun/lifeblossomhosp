import type { User } from "@/lib/api-types";

export type Role = "patient" | "admin" | "doctor" | "nurse" | "accountant" | "super_admin";

/** All staff roles (non-patient). */
export const STAFF_ROLES: Role[] = ["super_admin", "admin", "doctor", "nurse", "accountant"];

/** Roles that have clinical data access. */
export const CLINICAL_ROLES: Role[] = ["super_admin", "admin", "doctor", "nurse"];

/** Roles that have billing/finance access. */
export const BILLING_ROLES: Role[] = ["super_admin", "admin", "accountant"];

/** Roles that can manage users (create/update/delete). */
export const ADMIN_ROLES: Role[] = ["super_admin", "admin"];

export function hasRole(user: User | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as Role);
}

export function isStaff(user: User | null): boolean {
  return hasRole(user, STAFF_ROLES);
}

export function isAdmin(user: User | null): boolean {
  return hasRole(user, ADMIN_ROLES);
}

export function isClinical(user: User | null): boolean {
  return hasRole(user, CLINICAL_ROLES);
}

/** Get the default dashboard path for a given role. */
export function getDefaultPath(role: Role): string {
  switch (role) {
    case "patient": return "/patient";
    case "super_admin": return "/admin";
    case "admin": return "/admin";
    case "doctor": return "/admin";
    case "nurse": return "/admin";
    case "accountant": return "/admin";
  }
}
