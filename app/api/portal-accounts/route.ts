import { NextResponse } from "next/server";
import {
  AccountError,
  getSession,
  listAccounts,
  updateAccount,
} from "@/lib/portal/accounts";
import { handleApiError } from "@/lib/workflow/auth";

// Admin-only: list the portal logins and change their names / passwords.
// The check uses the signed session cookie, not the plain `portal` cookie.

async function adminCheck(): Promise<NextResponse | null> {
  const me = await getSession();
  if (!me) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!me.isAdmin) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    const denied = await adminCheck();
    if (denied) return denied;
    return NextResponse.json(await listAccounts());
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const denied = await adminCheck();
    if (denied) return denied;

    const body = (await req.json().catch(() => ({}))) as {
      id?: unknown;
      name?: unknown;
      password?: unknown;
    };
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const changes: { name?: string; password?: string } = {};
    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 1 || name.length > 60) {
        return NextResponse.json(
          { error: "Name must be 1 to 60 characters" },
          { status: 400 },
        );
      }
      changes.name = name;
    }
    if (body.password !== undefined) {
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 3 || password.length > 100) {
        return NextResponse.json(
          { error: "Password must be 3 to 100 characters" },
          { status: 400 },
        );
      }
      changes.password = password;
    }
    if (changes.name === undefined && changes.password === undefined) {
      return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
    }

    await updateAccount(id, changes);
    return NextResponse.json(await listAccounts());
  } catch (err) {
    if (err instanceof AccountError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return handleApiError(err);
  }
}
