"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/api-types";
import { CLINICAL_ROLES, FULL_ACCESS_ROLES, ADMIN_ROLES } from "@/lib/role-access";

interface PageGuardProps {
  children: React.ReactNode;
  /** Roles allowed to view this page (empty = any authenticated user) */
  allowedRoles?: UserRole[];
  /** If true, only super_admin and admin can access */
  adminOnly?: boolean;
  /** If true, only super_admin can access */
  superAdminOnly?: boolean;
  /** Redirect path on unauthorized (default /admin) */
  fallback?: string;
}

export default function PageGuard({
  children,
  allowedRoles,
  adminOnly,
  superAdminOnly,
  fallback = "/admin",
}: PageGuardProps) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return; // still loading
    const role = user.role;

    if (superAdminOnly && role !== "super_admin") {
      router.replace(fallback);
      return;
    }

    if (adminOnly && !ADMIN_ROLES.includes(role)) {
      router.replace(fallback);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace(fallback);
      return;
    }
  }, [user, allowedRoles, adminOnly, superAdminOnly, fallback, router]);

  if (!user) return null;

  const role = user.role;
  if (superAdminOnly && role !== "super_admin") return null;
  if (adminOnly && !ADMIN_ROLES.includes(role)) return null;
  if (allowedRoles && !allowedRoles.includes(role)) return null;

  return <>{children}</>;
}
