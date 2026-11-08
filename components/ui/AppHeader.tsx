'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavLinkItem {
  href: string;
  label: string;
  matchPrefix: string[];
}

// Everything below is for logged-in supervisors / executives. A visitor who is
// not logged in never sees these links.
const NAV_LINKS: NavLinkItem[] = [
  { href: '/report', label: 'Report incident', matchPrefix: ['/report'] },
  { href: '/my-reports', label: 'My reports', matchPrefix: ['/my-reports'] },
  { href: '/supervisor', label: 'Supervisor', matchPrefix: ['/supervisor'] },
  { href: '/inbox', label: 'Specialty inbox', matchPrefix: ['/inbox'] },
  { href: '/ea', label: 'EA filing', matchPrefix: ['/ea'] },
  { href: '/portal/trends', label: 'Trends', matchPrefix: ['/portal/trends'] },
  {
    href: '/portal/responses',
    label: 'Portal',
    matchPrefix: ['/portal/responses', '/portal/status', '/portal/form-editor', '/portal/accounts'],
  },
];

interface Me {
  name: string;
  isAdmin: boolean;
}

function Brand({ withSubtitle }: { withSubtitle: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      {/* Logo-green tile with a dark-brown "L" (6:1 contrast) */}
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-slate-900 shadow-2xs transition group-hover:bg-blue-300">
        L
      </div>
      <div className="leading-tight">
        <span className="block text-sm font-bold tracking-tight text-slate-900">Langs Line</span>
        {withSubtitle ? (
          <span className="block text-[11px] font-medium text-slate-500">
            Incident &amp; Pathway Console
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  // Is a supervisor / executive logged in? Asks the server, because the real
  // session cookie is hidden from the browser. Re-checks on every page change,
  // so it updates right after signing in or out.
  useEffect(() => {
    let live = true;
    fetch('/api/portal-login')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { account?: Me } | null) => {
        if (live) setMe(d?.account ?? null);
      })
      .catch(() => {
        if (live) setMe(null);
      });
    return () => {
      live = false;
    };
  }, [pathname]);

  const signOut = async () => {
    await fetch('/api/portal-login', { method: 'DELETE' }).catch(() => {});
    setMe(null);
    router.push('/');
    router.refresh();
  };

  // Someone filling in a report only needs the brand and a way out — no
  // reviewer links, "My reports" or sign-in details.
  const staffMode = ['/report', '/my-reports'].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (staffMode) {
    return (
      <header className="sticky top-0 z-40 border-b-2 border-brand bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Brand withSubtitle={false} />
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            ← Home
          </Link>
        </div>
      </header>
    );
  }

  // Not logged in: nothing from the supervisor / executive side.
  if (!me) {
    return (
      <header className="sticky top-0 z-40 border-b-2 border-brand bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Brand withSubtitle={false} />
          <Link
            href="/report"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Report an incident
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-brand bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-5">
          <Brand withSubtitle />

          {/* Navigation links */}
          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((item) => {
              const isActive = item.matchPrefix.some(
                (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
              );
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-50 text-accent ring-1 ring-inset ring-blue-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Who is signed in */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Signed in as <span className="font-semibold text-slate-800">{me.name}</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile horizontal nav bar */}
      <nav
        aria-label="Mobile navigation"
        className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-1.5 lg:hidden"
      >
        {NAV_LINKS.map((item) => {
          const isActive = item.matchPrefix.some(
            (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
          );
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${
                isActive
                  ? 'bg-blue-50 text-accent ring-1 ring-inset ring-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
