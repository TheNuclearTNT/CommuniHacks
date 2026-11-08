"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/portal/responses", label: "Form responses" },
  { href: "/portal/status", label: "Report status" },
  { href: "/portal/trends", label: "Trends" },
  { href: "/portal/form-editor", label: "Form editor" },
];

// Top navigator for the supervisor / executive portal.
export function PortalNav() {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await fetch("/api/portal-login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-2">
        <Link href="/" className="mr-3 font-bold text-slate-900">
          Langs SafeReport
        </Link>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "rounded-md px-3 py-2 text-sm " +
                (active
                  ? "bg-accent-light font-medium text-accent"
                  : "text-slate-700 hover:bg-slate-100")
              }
            >
              {l.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={signOut}
          className="ml-auto rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
