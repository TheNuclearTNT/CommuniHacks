"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// DEMO login for the supervisor / executive portal. Password is 123.
// This is a demo gate only, not real access control.
// Where to go after signing in (a status column clicked on the home page, or
// a reviewer page the proxy sent you here from). Only our own reviewer pages.
const ALLOWED_NEXT = ["/portal/", "/supervisor", "/inbox", "/ea", "/records", "/dashboard", "/follow-ups", "/qr"];
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  const safe = next.startsWith("/") && !next.startsWith("//") && ALLOWED_NEXT.some((p) => next.startsWith(p));
  return safe ? next : "/portal/responses";
}

export default function PortalLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: go straight there.
  useEffect(() => {
    if (document.cookie.split("; ").includes("portal=1")) {
      router.replace(nextPath());
    }
  }, [router]);

  const doSignIn = async (pwd: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (!res.ok) {
        setError("Incorrect password. For this demo, enter 123.");
        setBusy(false);
        return;
      }
      router.push(nextPath());
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSignIn(password);
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
        <Link
          href="/"
          className="mb-5 inline-flex items-center text-xs font-semibold text-accent hover:underline"
        >
          ← Back to home
        </Link>

        <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
          Supervisor &amp; Leadership Portal
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Portal sign in
        </h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">
          Access form responses, the 4-stage pathway board, trends, and the live 35-question form editor.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="portal-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600"
            >
              Demo Password (pre-filled: 123)
            </label>
            <input
              id="portal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
              autoFocus
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="tap-target w-full rounded-xl bg-accent px-5 py-3.5 text-base font-semibold text-white shadow-xs transition hover:bg-blue-800 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Enter Portal →"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Demo gate only — you can also switch staff personas at any time from the top navigation bar.
        </p>
      </div>
    </main>
  );
}
