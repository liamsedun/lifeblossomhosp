import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type Role = "patient" | "admin" | "doctor" | "nurse" | "accountant" | "super_admin";

const STAFF_ROLES: Role[] = ["super_admin", "admin", "doctor", "nurse", "accountant"];

/** Routes that require authentication. */
const PROTECTED_ROUTES = [
  { prefix: "/patient", allowedRoles: ["patient" as Role] },
  { prefix: "/admin", allowedRoles: STAFF_ROLES },
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Find matching protected route
  const matchedRoute = PROTECTED_ROUTES.find((r) => pathname.startsWith(r.prefix));

  // Not authenticated → redirect to login
  if (matchedRoute && !authUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (authUser) {
    // Fetch the user's role from the public.users table via RLS
    // (must use the authenticated client so RLS applies)
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .maybeSingle();

    const role = (profile?.role as Role | undefined) || null;

    // Check role-based access
    if (matchedRoute && role && !matchedRoute.allowedRoles.includes(role)) {
      // Redirect to the correct dashboard for their role
      const url = request.nextUrl.clone();
      if (role === "patient") {
        url.pathname = "/patient";
      } else {
        url.pathname = "/admin";
      }
      return NextResponse.redirect(url);
    }

    // Redirect logged-in users away from auth pages
    if (pathname === "/login" && role) {
      const url = request.nextUrl.clone();
      url.pathname = role === "patient" ? "/patient" : "/admin";
      return NextResponse.redirect(url);
    }

    // Role-aware redirect for root path
    if (pathname === "/" && role) {
      const url = request.nextUrl.clone();
      url.pathname = role === "patient" ? "/patient" : "/admin";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
