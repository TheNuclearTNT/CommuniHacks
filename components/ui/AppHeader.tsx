'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMe, getUsers, setMe } from '@/lib/api-client';
import { SEED_USERS as MOCK_USERS } from '@/lib/mock/connan';
import { getRoleLabel } from '@/lib/question-labels';
import type { Role, User } from '@/lib/types';

interface NavLinkItem {
  href: string;
  label: string;
  matchPrefix: string[];
}

const NAV_LINKS: NavLinkItem[] = [
  { href: '/report', label: 'Report incident', matchPrefix: ['/report'] },
  { href: '/my-reports', label: 'My reports', matchPrefix: ['/my-reports'] },
  { href: '/supervisor', label: 'Supervisor', matchPrefix: ['/supervisor'] },
  { href: '/inbox', label: 'Specialty inbox', matchPrefix: ['/inbox'] },
  { href: '/ea', label: 'EA filing', matchPrefix: ['/ea'] },
  { href: '/dashboard', label: 'Trends', matchPrefix: ['/dashboard'] },
  { href: '/portal/responses', label: 'Portal', matchPrefix: ['/portal'] },
];

const ROLE_DEFAULT_DEST: Record<Role, string> = {
  STAFF: '/report',
  SUPERVISOR: '/supervisor',
  PRIVACY_OFFICER: '/inbox',
  JOHSC_CHAIR: '/inbox',
  IT_FACILITIES: '/inbox',
  DIRECTOR_OPS: '/inbox',
  CID_GROUP: '/inbox',
  EXEC_ASSISTANT: '/ea',
  EXECUTIVE: '/dashboard',
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[3]); // Bill Teasdale default
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getUsers().catch(() => MOCK_USERS),
      getMe().catch(() => MOCK_USERS[3]),
    ]).then(([userList, me]) => {
      if (!active) return;
      const list = userList.length ? userList : MOCK_USERS;
      setUsers(list);
      const matched = list.find((u) => u.id === me.id) ?? list.find((u) => u.role === me.role) ?? me;
      setCurrentUser(matched);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const handleSelectUser = async (userId: string, navigateToWorkspace = false) => {
    const selected = users.find((u) => u.id === userId);
    if (!selected) return;
    setSwitching(true);
    setCurrentUser(selected);
    try {
      await setMe({ userId: selected.id, role: selected.role });
    } catch {
      // Ignore if offline
    } finally {
      setSwitching(false);
      window.dispatchEvent(new CustomEvent('langs:role-changed', { detail: selected }));
      if (navigateToWorkspace) {
        router.push(ROLE_DEFAULT_DEST[selected.role] ?? '/');
      } else {
        router.refresh();
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white shadow-2xs transition group-hover:bg-blue-800">
              L
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-slate-900">
                Langs SafeReport
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Incident &amp; Pathway Console
              </span>
            </div>
          </Link>

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

        {/* Live Demo Persona Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:inline">
              Active Persona:
            </span>
            <select
              aria-label="Switch demo persona"
              value={currentUser.id}
              disabled={switching}
              onChange={(e) => handleSelectUser(e.target.value, false)}
              className="cursor-pointer bg-transparent text-xs font-semibold text-slate-900 focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {getRoleLabel(u.role)}
                  {u.site ? ` (${u.site})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleSelectUser(currentUser.id, true)}
              title={`Open ${getRoleLabel(currentUser.role)} workspace`}
              className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-blue-800"
            >
              Open view →
            </button>
          </div>
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
