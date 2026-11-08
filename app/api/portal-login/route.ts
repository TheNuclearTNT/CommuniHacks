import { NextResponse } from "next/server";

// DEMO-ONLY login gate for the supervisor/executive portal.
// The password is a hardcoded demo value (123) — this is NOT real security.
// Anyone with the code or browser tools can see it. It only keeps the staff
// reporting flow visually separate from the reviewer views for the demo.
const DEMO_PASSWORD = "123";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  if (password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Mark the session as a portal user. Short-lived, httpOnly off so the client
  // can read it is unnecessary — the middleware/pages check it server-side.
  res.cookies.set("portal", "1", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("portal", "", { path: "/", maxAge: 0 });
  return res;
}
