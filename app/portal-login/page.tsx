"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Supervisor / executive sign in. Each person has their own name + password.
// Demo-grade: every account starts with the password 123 (see README).
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
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: go straight there. Asks the server, because the real
  // session cookie is hidden from the browser's own scripts.
  useEffect(() => {
    let live = true;
    fetch("/api/portal-login")
      .then((r) => {
        if (live && r.ok) router.replace(nextPath());
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not sign in. Please try again.");
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

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
        <Link
          href="/"
          className="mb-5 inline-flex items-center text-xs font-semibold text-accent hover:underline"
        >
          ← Back to home
        </Link>

        <Image
          src="/langs-logo.png"
          alt="Langs: Community. Health. Wellness."
          width={504}
          height={208}
          priority
          className="mb-4 h-14 w-auto"
        />

        <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
          Supervisor &amp; Leadership Portal
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Supervisor Login
        </h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">
          Sign in with your own name and password to review reports, see
          trends, and use the form editor.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="portal-name" className={labelClass}>
              Name
            </label>
            <input
              id="portal-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="portal-password" className={labelClass}>
              Password
            </label>
            <input
              id="portal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
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
            disabled={busy || !name.trim() || !password}
            className="tap-target w-full rounded-xl bg-accent px-5 py-3.5 text-base font-semibold text-white shadow-xs transition hover:bg-blue-800 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Demo prototype — every account starts with the password 123.
        </p>
      </div>
    </main>
  );
}
