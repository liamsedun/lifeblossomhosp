"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/lib/rbac";

interface Props {
  children: React.ReactNode;
  roles?: Role[];
  fallback?: string;
}

/** Wraps a page/component to enforce authentication and optional role check. */
export default function ProtectedRoute({ children, roles, fallback = "/login" }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(fallback);
      return;
    }
    if (roles && !roles.includes(user.role as Role)) {
      const rolePath = user.role === "patient" ? "/patient" : "/admin";
      router.replace(rolePath);
    }
  }, [user, loading, roles, router, fallback]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  if (roles && !roles.includes(user.role as Role)) return null;

  return <>{children}</>;
}
