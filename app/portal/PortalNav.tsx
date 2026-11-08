"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/portal/responses", label: "All Form Responses" },
  { href: "/portal/status", label: "Pathway Kanban Board" },
  { href: "/portal/trends", label: "Executive Trends" },
  { href: "/portal/form-editor", label: "35-Question Form Editor" },
];

// Sub-navigator for the supervisor / executive portal.
export function PortalNav() {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await fetch("/api/portal-login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  };

  return (
    <nav
      aria-label="Portal sections"
      className="border-b border-slate-200 bg-slate-50/90"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-2 rounded-md bg-slate-200/80 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
            Admin Portal
          </span>
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                  (active
                    ? "bg-accent text-white shadow-2xs"
                    : "text-slate-700 hover:bg-white hover:text-slate-900")
                }
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Lock portal
        </button>
      </div>
    </nav>
  );
}
