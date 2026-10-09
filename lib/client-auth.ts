/**
 * Client-side session helpers.
 *
 * Authorization is server-driven via the HttpOnly session cookie. The cached
 * localStorage profile is display-only; dashboards confirm the live session
 * through /api/auth/me on load.
 */

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user && user.id && user.role ? user : null;
  } catch {
    return null;
  }
}

/**
 * Validate the live server session for the given role(s).
 * Returns the server-confirmed user, or null when unauthenticated/role-mismatched.
 */
export async function fetchSessionUser(allowedRoles: string[]): Promise<StoredUser | null> {
  const fetchMe = async () =>
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });

  try {
    let res = await fetchMe();
    // One retry for transient server blips so a refresh during a momentary
    // hiccup does not sign the user out.
    if (res.status >= 500) {
      await new Promise((r) => setTimeout(r, 400));
      res = await fetchMe();
    }
    if (res.status === 503) return null; // dashboards show the degraded banner
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.user;
    if (!user || !allowedRoles.includes(String(user.role).toUpperCase())) return null;
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

/** Clear the session cookie server-side, drop the cached profile, and go to login. */
export async function logoutAndRedirect(router: { push: (href: string) => void }, loginPath = "/login") {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // Cookie may already be gone; proceed with the client-side cleanup.
  }
  localStorage.removeItem("user");
  router.push(loginPath);
}
