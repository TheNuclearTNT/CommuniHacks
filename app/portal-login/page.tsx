"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// DEMO login for the supervisor / executive portal. Password is 123.
// This is a demo gate only, not real access control.
export default function PortalLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Wrong password. For this demo it is 123.");
        setBusy(false);
        return;
      }
      router.push("/portal/responses");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <Link href="/" className="mb-6 text-sm text-accent underline">
        ← Back to home
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        Supervisor / Executive sign in
      </h1>
      <p className="mb-6 text-slate-600">
        Enter the demo password to see reports, trends and the form editor.
      </p>

      <form onSubmit={submit}>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-3 text-base text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          autoFocus
        />
        {error && <p className="mb-4 text-warn">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="tap-target w-full rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Demo gate only — the password is not real security.
      </p>
    </main>
  );
}
