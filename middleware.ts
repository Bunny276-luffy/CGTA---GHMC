import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session";

/**
 * CivicTrust Role-Based Access Middleware
 *
 * Enforces route protection at the server level:
 * - /citizen/* requires CITIZEN role
 * - /officer/* requires OFFICER role (except /officer/login)
 * - /admin/* requires ADMIN role (except /admin/login)
 * - /dept-head/* requires DEPT_HEAD or ADMIN role (except /dept-head/login)
 *
 * Sessions are HMAC-signed tokens stored in an HttpOnly cookie set by the
 * login/register API. The signature is verified here (Web Crypto, Edge
 * runtime) so clients cannot forge a role by writing a cookie.
 */

// Routes that require authentication
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/citizen": ["CITIZEN"],
  "/officer": ["OFFICER"],
  "/admin": ["ADMIN", "DEPT_HEAD"],
  "/dept-head": ["DEPT_HEAD", "ADMIN"],
};

// Login routes — role a signed-in user would expect on each of them. A user
// with a matching live session is redirected straight to their portal
// instead of being shown the credential form again ("in-built memory").
const LOGIN_ROUTES: Record<string, string[]> = {
  "/login": ["CITIZEN"],
  "/register": ["CITIZEN"],
  "/officer/login": ["OFFICER"],
  "/admin/login": ["ADMIN"],
  "/dept-head/login": ["DEPT_HEAD", "ADMIN"],
};

const PORTAL_FOR_LOGIN: Record<string, string> = {
  "/login": "/citizen",
  "/register": "/citizen",
  "/officer/login": "/officer",
  "/admin/login": "/admin",
  "/dept-head/login": "/dept-head",
};

// Redirect targets for each role domain
const LOGIN_REDIRECTS: Record<string, string> = {
  "/citizen": "/login",
  "/officer": "/officer/login",
  "/admin": "/admin/login",
  "/dept-head": "/dept-head/login",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static assets, and public pages
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname === "/" ||
    pathname === "/public-stats" ||
    pathname === "/track" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // A helper that resolves the live session, trying every duplicate cookie.
  const resolveSession = async () => {
    const rawCookies = request.headers.get("cookie") || "";
    const tokens = rawCookies
      .split(";")
      .map((pair) => pair.trim())
      .filter((pair) => pair.startsWith(`${SESSION_COOKIE}=`))
      .map((pair) => decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1)));

    for (const token of tokens) {
      const session = await verifySession(token);
      if (session) return session;
    }
    return null;
  };

  // Signed-in users visiting a login page are sent straight to their portal.
  if (pathname in LOGIN_ROUTES) {
    const session = await resolveSession();
    if (session) {
      const role = session.role?.toUpperCase();
      if (role && LOGIN_ROUTES[pathname].includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = PORTAL_FOR_LOGIN[pathname];
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // Check if this is a protected route
  for (const [routePrefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      const session = await resolveSession();

      if (!session) {
        // No valid session — redirect to the appropriate login page
        const loginUrl = LOGIN_REDIRECTS[routePrefix] || "/login";
        const url = request.nextUrl.clone();
        url.pathname = loginUrl;
        return NextResponse.redirect(url);
      }

      const userRole = session.role?.toUpperCase();
      if (!userRole || !allowedRoles.includes(userRole)) {
        // Wrong role — redirect to the correct login for this route
        const loginUrl = LOGIN_REDIRECTS[routePrefix] || "/login";
        const url = request.nextUrl.clone();
        url.pathname = loginUrl;
        url.searchParams.set("error", "unauthorized");
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
    "/login",
    "/register",
  ],
};
