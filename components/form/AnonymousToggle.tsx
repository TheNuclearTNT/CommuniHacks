"use client";

import { ToConfirmTag } from "@/components/ui";

// "Report anonymously": the report is saved without the reporter's user id
// and question 3 reads "Anonymous". Langs policy on anonymous reports is TO
// CONFIRM (it limits follow-up with the reporter).
export function AnonymousToggle({
  anonymous,
  onChange,
}: {
  anonymous: boolean;
  onChange: (anonymous: boolean) => void;
}) {
  return (
    <label
      className={
        "mb-5 flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition " +
        (anonymous ? "border-accent bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300")
      }
    >
      <input
        type="checkbox"
        checked={anonymous}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
          Report anonymously
          <ToConfirmTag />
        </span>
        <span className="mt-0.5 block text-sm text-slate-600">
          {anonymous
            ? "Your name won't be attached. Supervisors will see “Anonymous reporter”. Try not to name yourself in the description, and keep your reference number: anonymous reports don't appear in My reports."
            : "Don't want your name on this report? Tick this and it won't be attached."}
        </span>
      </span>
    </label>
  );
}
