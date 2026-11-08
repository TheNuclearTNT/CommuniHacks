import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession, type PortalAccount } from "./accounts";

// Server-side "must be logged in" checks for the supervisor / executive side.
// They read the signed session cookie set by /api/portal-login — the plain role
// cookies and the old persona switcher do NOT count as logging in.

/** For pages and layouts: send logged-out visitors to the login page. */
export async function requireSignedIn(): Promise<PortalAccount> {
  const account = await getSession();
  if (!account) redirect("/portal-login");
  return account;
}

/** For API routes: returns a 401 response if logged out, otherwise null. */
export async function denyIfSignedOut(): Promise<NextResponse | null> {
  const account = await getSession();
  if (account) return null;
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}
