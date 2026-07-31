"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/api-types";
import { ADMIN_ROLES } from "@/lib/role-access";

export function useRoleGuard(allowedRoles: UserRole[], fallback = "/admin") {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (!allowedRoles.includes(user.role)) {
      router.replace(fallback);
    }
  }, [user, allowedRoles, fallback, router]);

  return { user, authorized: user ? allowedRoles.includes(user.role) : false };
}

export function useAdminGuard() {
  return useRoleGuard(["super_admin", "admin"]);
}

export function useSuperAdminGuard() {
  return useRoleGuard(["super_admin"]);
}
