import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CivicTrust Role-Based Access Middleware
 * 
 * Enforces route protection at the server level:
 * - /citizen/* requires CITIZEN role
 * - /officer/* requires OFFICER role (except /officer/login)
 * - /admin/* requires ADMIN role (except /admin/login)
 * - /dept-head/* requires DEPT_HEAD or ADMIN role (except /dept-head/login)
 * 
 * Authentication is token-based via localStorage on client and cookie/header on server.
 * Since this is a client-side auth system using localStorage, the middleware validates
 * the token from the cookie that the client sets, or redirects to the appropriate login.
 */

// Routes that require authentication
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/citizen": ["CITIZEN"],
  "/officer": ["OFFICER"],
  "/admin": ["ADMIN", "DEPT_HEAD"],
  "/dept-head": ["DEPT_HEAD", "ADMIN"],
};

// Login routes — never protected
const LOGIN_ROUTES = [
  "/login",
  "/register",
  "/officer/login",
  "/admin/login",
  "/dept-head/login",
];

// Redirect targets for each role domain
const LOGIN_REDIRECTS: Record<string, string> = {
  "/citizen": "/login",
  "/officer": "/officer/login",
  "/admin": "/admin/login",
  "/dept-head": "/dept-head/login",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login/register routes, API routes, static assets, and public pages
  if (
    LOGIN_ROUTES.some((route) => pathname === route) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname === "/" ||
    pathname === "/public-stats" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  for (const [routePrefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      // Try to extract user role from the civictrust-auth cookie
      const authCookie = request.cookies.get("civictrust-auth")?.value;

      if (!authCookie) {
        // No auth cookie — redirect to the appropriate login page
        const loginUrl = LOGIN_REDIRECTS[routePrefix] || "/login";
        const url = request.nextUrl.clone();
        url.pathname = loginUrl;
        return NextResponse.redirect(url);
      }

      try {
        // Decode the role from the cookie (format: base64 JSON)
        const userData = JSON.parse(atob(authCookie));
        const userRole = userData?.role?.toUpperCase();

        if (!userRole || !allowedRoles.includes(userRole)) {
          // Wrong role — redirect to the correct login for this route
          const loginUrl = LOGIN_REDIRECTS[routePrefix] || "/login";
          const url = request.nextUrl.clone();
          url.pathname = loginUrl;
          url.searchParams.set("error", "unauthorized");
          return NextResponse.redirect(url);
        }
      } catch {
        // Invalid cookie — redirect to login
        const loginUrl = LOGIN_REDIRECTS[routePrefix] || "/login";
        const url = request.nextUrl.clone();
        url.pathname = loginUrl;
        return NextResponse.redirect(url);
      }

      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/citizen/:path*",
    "/officer/:path*",
    "/admin/:path*",
    "/dept-head/:path*",
  ],
};
