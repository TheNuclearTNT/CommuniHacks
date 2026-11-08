"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/portal/responses", label: "All Form Responses" },
  { href: "/portal/status", label: "Pathway Kanban Board" },
  { href: "/portal/trends", label: "Executive Trends" },
  { href: "/follow-ups", label: "Follow-up Board" },
  { href: "/qr", label: "QR Posters" },
  { href: "/portal/form-editor", label: "35-Question Form Editor" },
];

const ADMIN_LINK = { href: "/portal/accounts", label: "Manage Accounts" };

interface Me {
  name: string;
  isAdmin: boolean;
}

// Sub-navigator for the supervisor / executive portal.
export function PortalNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  // Who is signed in (for the greeting and the admin-only link).
  useEffect(() => {
    let live = true;
    fetch("/api/portal-login")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { account?: Me } | null) => {
        if (live && d?.account) setMe(d.account);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Only ADMIN gets the account-management link. (Sign out lives in the main
  // header, which also shows who is signed in.)
  const links = me?.isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;

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
          {links.map((l) => {
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

      </div>
    </nav>
  );
}
