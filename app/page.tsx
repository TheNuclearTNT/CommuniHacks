"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Card } from '@/components/ui';
import { getMe, getUsers, setMe } from '@/lib/api-client';
import type { Role, User } from '@/lib/types';
import { MOCK_ROLE_USERS, ROLE_DESTINATIONS, ROLE_LABELS } from '@/lib/mock/neel';

const ROLE_ORDER: Role[] = [
  'STAFF',
  'SUPERVISOR',
  'PRIVACY_OFFICER',
  'JOHSC_CHAIR',
  'IT_FACILITIES',
  'DIRECTOR_OPS',
  'CID_GROUP',
  'EXEC_ASSISTANT',
  'EXECUTIVE',
];

export default function HomePage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(MOCK_ROLE_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const [allUsers, me] = await Promise.all([
          getUsers().catch(() => MOCK_ROLE_USERS),
          getMe().catch(() => null),
        ]);

        if (cancelled) return;
        setUsers(allUsers.length ? allUsers : MOCK_ROLE_USERS);
        setCurrentUser(me ?? MOCK_ROLE_USERS[0]);
        setIsMock(false);
      } catch {
        if (!cancelled) {
          setUsers(MOCK_ROLE_USERS);
          setCurrentUser(MOCK_ROLE_USERS[0]);
          setIsMock(true);
        }
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupedUsers = useMemo(
    () =>
      ROLE_ORDER.map((role) => ({
        role,
        title: ROLE_LABELS[role],
        users: users.filter((user) => user.role === role),
      })).filter((group) => group.users.length > 0),
    [users],
  );

  async function handleRoleSelect(user: User) {
    setSwitchingId(user.id);
    setError(null);

    const setFallbackCookies = () => {
      if (typeof document === 'undefined') {
        return;
      }

      const cookies = [
        `userId=${encodeURIComponent(user.id)}; path=/; max-age=${60 * 60 * 24 * 7}`,
        `role=${encodeURIComponent(user.role)}; path=/; max-age=${60 * 60 * 24 * 7}`,
      ];

      cookies.forEach((cookie) => {
        document.cookie = cookie;
      });
    };

    try {
      await setMe(user.id);
      setCurrentUser(user);
      router.replace(ROLE_DESTINATIONS[user.role]);
      return;
    } catch {
      setIsMock(true);
      setFallbackCookies();
      setCurrentUser(user);
      router.replace(ROLE_DESTINATIONS[user.role]);
    } finally {
      setSwitchingId(null);
    }
  }

  async function handleHeaderSwitchRole() {
    if (!users.length) {
      return;
    }

    const currentIndex = users.findIndex((user) => user.id === currentUser?.id);
    const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
    const nextUser = users.slice(startIndex).concat(users.slice(0, startIndex)).find(Boolean);

    if (!nextUser || nextUser.id === currentUser?.id) {
      return;
    }

    await handleRoleSelect(nextUser);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
              Langs SafeReport
            </p>
            <p className="text-sm text-slate-600">Incident review and routing</p>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <Badge tone="slate">
                {currentUser.name} · {ROLE_LABELS[currentUser.role]}
              </Badge>
            ) : null}
            <button
              type="button"
              onClick={() => void handleHeaderSwitchRole()}
              className="text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              Switch role
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Langs Community Health Centre
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Choose a role to continue
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-200 hover:text-blue-700"
            >
              Trends
            </Link>
            <Link
              href="/report"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-200 hover:text-blue-700"
            >
              Staff entry
            </Link>
          </div>
        </div>

        {isMock ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Role switcher is using the local mock data because the live role API was unavailable.
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groupedUsers.map((group) => (
            <Card key={group.role} className="h-full">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">{group.title}</h2>
                <Badge tone="slate">{group.users.length}</Badge>
              </div>

              <div className="space-y-3">
                {group.users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleRoleSelect(user)}
                    disabled={switchingId === user.id}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-80"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.site ?? 'No site assigned'}</p>
                      </div>

                      <span className="text-sm font-medium text-accent">
                        {switchingId === user.id ? 'Opening…' : 'Open'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
