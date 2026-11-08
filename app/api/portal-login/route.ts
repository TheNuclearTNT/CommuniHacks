import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  getSession,
  makeSessionValue,
  verifyLogin,
} from "@/lib/portal/accounts";
import { handleApiError } from "@/lib/workflow/auth";

// Per-person login for the supervisor / executive portal (demo-grade).
// POST   { name, password } -> signs in, sets cookies
// GET    -> who is signed in right now (401 if nobody)
// DELETE -> sign out

const MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: unknown;
      password?: unknown;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !password) {
      return NextResponse.json(
        { error: "Enter your name and password" },
        { status: 400 },
      );
    }

    const account = await verifyLogin(name, password);
    if (!account) {
      // Same message for a wrong name or a wrong password.
      return NextResponse.json(
        { error: "Wrong name or password" },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ ok: true, account });
    const base = { path: "/", sameSite: "lax" as const, maxAge: MAX_AGE };

    // Signed, server-only session: this is what admin actions trust.
    res.cookies.set(SESSION_COOKIE, makeSessionValue(account.id), {
      ...base,
      httpOnly: true,
      secure: Boolean(process.env.VERCEL),
    });
    // The role cookies the rest of the app reads to know who is acting.
    res.cookies.set("userId", account.userId, base);
    res.cookies.set("role", account.role, base);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    const account = await getSession();
    if (!account) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    return NextResponse.json({ account });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set("portal", "", { path: "/", maxAge: 0 }); // old flag, tidy up
  return res;
}
