"use client";

import { useEffect, useState } from "react";
import { getRoleLabel } from "@/lib/question-labels";

interface Account {
  id: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

interface Draft {
  name: string;
  password: string;
}

type RowState = { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

// /portal/accounts — ADMIN only. Change any supervisor / executive login name
// or password. The server re-checks that you are the ADMIN on every request.
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/portal-accounts")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          throw new Error("Only the ADMIN account can manage logins. Sign in as ADMIN.");
        }
        if (!r.ok) throw new Error("Could not load the accounts.");
        return r.json() as Promise<Account[]>;
      })
      .then((list) => {
        if (!live) return;
        setAccounts(list);
        setDrafts(
          Object.fromEntries(list.map((a) => [a.id, { name: a.name, password: "" }])),
        );
      })
      .catch((e: unknown) => {
        if (live) setLoadError(e instanceof Error ? e.message : "Could not load the accounts.");
      });
    return () => {
      live = false;
    };
  }, []);

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setRowState((s) => {
      const { [id]: _drop, ...rest } = s;
      void _drop;
      return rest;
    });
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const save = async (account: Account) => {
    const draft = drafts[account.id];
    const body: { id: string; name?: string; password?: string } = { id: account.id };
    if (draft.name.trim() !== account.name) body.name = draft.name.trim();
    if (draft.password) body.password = draft.password;
    if (body.name === undefined && body.password === undefined) return;

    setRowState((s) => ({ ...s, [account.id]: { kind: "saving" } }));
    try {
      const res = await fetch("/api/portal-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Account[] | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        const message = !Array.isArray(data) && data.error ? data.error : "Could not save.";
        setRowState((s) => ({ ...s, [account.id]: { kind: "error", message } }));
        return;
      }
      setAccounts(data);
      setDrafts((d) => ({
        ...d,
        [account.id]: {
          name: data.find((a) => a.id === account.id)?.name ?? draft.name,
          password: "",
        },
      }));
      setRowState((s) => ({ ...s, [account.id]: { kind: "saved" } }));
    } catch {
      setRowState((s) => ({
        ...s,
        [account.id]: { kind: "error", message: "Could not save. Try again." },
      }));
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-slate-100 disabled:text-slate-500";

  return (
    <main>
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
        Portal · Admin
      </span>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Manage Accounts
      </h1>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-slate-600">
        Change the login name or password for each supervisor, specialty lead
        and executive. Leave the password blank to keep it as it is. This only
        changes who can sign in to the portal; it does not rename people in the
        staff list or in the form&apos;s supervisor choices.
      </p>

      {loadError && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </p>
      )}
      {!accounts && !loadError && <p className="text-slate-500">Loading…</p>}

      <ul className="flex flex-col gap-3">
        {accounts?.map((a) => {
          const draft = drafts[a.id] ?? { name: a.name, password: "" };
          const state = rowState[a.id];
          const changed = draft.name.trim() !== a.name || draft.password !== "";
          return (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-accent">
                  {a.isAdmin ? "Administrator" : getRoleLabel(a.role)}
                </span>
                <span className="font-mono text-[11px] text-slate-400">{a.id}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <label htmlFor={`name-${a.id}`} className="mb-1 block text-xs font-semibold text-slate-600">
                    Login name
                  </label>
                  <input
                    id={`name-${a.id}`}
                    type="text"
                    value={draft.name}
                    disabled={a.isAdmin}
                    onChange={(e) => setDraft(a.id, { name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`pw-${a.id}`} className="mb-1 block text-xs font-semibold text-slate-600">
                    New password
                  </label>
                  <input
                    id={`pw-${a.id}`}
                    type="text"
                    value={draft.password}
                    placeholder="Leave blank to keep"
                    onChange={(e) => setDraft(a.id, { password: e.target.value })}
                    className={inputClass}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void save(a)}
                  disabled={!changed || state?.kind === "saving"}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-40"
                >
                  {state?.kind === "saving" ? "Saving…" : "Save"}
                </button>
              </div>

              {state?.kind === "saved" && (
                <p className="mt-2 text-xs font-medium text-emerald-700">Saved ✓</p>
              )}
              {state?.kind === "error" && (
                <p role="alert" className="mt-2 text-xs font-medium text-amber-800">
                  {state.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
