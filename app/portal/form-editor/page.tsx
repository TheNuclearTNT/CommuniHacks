"use client";

import { useEffect, useState } from "react";

interface Question {
  id: string;
  section: string;
  label: string;
  help: string | null;
  type: string;
  options: string[] | null;
  required: boolean;
  showIf: Record<string, string> | null;
}
interface Config {
  sections: string[];
  questions: Question[];
}

// /portal/form-editor — reword the 35 questions on screen. Edits label, help,
// required, and option text. Saves to the database so the change persists.
export default function FormEditorPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/form-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setError("Could not load the form."));
  }, []);

  const update = (id: string, patch: Partial<Question>) => {
    setSaved(false);
    setConfig((c) =>
      c
        ? {
            ...c,
            questions: c.questions.map((q) =>
              q.id === id ? { ...q, ...patch } : q,
            ),
          }
        : c,
    );
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/form-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Save failed");
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (error && !config) return <p className="text-warn">{error}</p>;
  if (!config) return <p className="text-slate-500">Loading…</p>;

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Form editor</h1>
          <p className="text-slate-600">
            Reword the questions staff see. Changes save to the database.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      {error && <p className="mb-4 text-warn">{error}</p>}

      <div className="flex flex-col gap-4">
        {config.questions.map((q) => (
          <div key={q.id} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500">
                {q.id}
              </span>
              <span className="text-xs text-slate-400">{q.section}</span>
              <span className="text-xs text-slate-400">· {q.type}</span>
              <label className="ml-auto flex items-center gap-1 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => update(q.id, { required: e.target.checked })}
                  className="accent-[#1d4ed8]"
                />
                Required
              </label>
            </div>

            <label className="mb-1 block text-xs text-slate-400">Question</label>
            <input
              type="text"
              value={q.label}
              onChange={(e) => update(q.id, { label: e.target.value })}
              className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-accent"
            />

            <label className="mb-1 block text-xs text-slate-400">
              Help text (optional)
            </label>
            <input
              type="text"
              value={q.help ?? ""}
              onChange={(e) =>
                update(q.id, { help: e.target.value || null })
              }
              className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 outline-none focus:border-accent"
            />

            {q.options && (
              <>
                <label className="mb-1 block text-xs text-slate-400">
                  Options (one per line)
                </label>
                <textarea
                  rows={Math.min(q.options.length, 6)}
                  value={q.options.join("\n")}
                  onChange={(e) =>
                    update(q.id, {
                      options: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent"
                />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </main>
  );
}
