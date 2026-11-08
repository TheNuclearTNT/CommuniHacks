import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = { title: 'Trends · Langs Line' };

// Executives own this screen. Supervisors are allowed too because the brief asks
// that supervisors can "see trends" (TO CONFIRM with the team).
const ALLOWED_ROLES = ['EXECUTIVE', 'SUPERVISOR'];

export default async function DashboardPage() {
  const role = (await cookies()).get('role')?.value;

  if (role && !ALLOWED_ROLES.includes(role)) {
    return (
      <main className="mx-auto max-w-xl bg-white px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Trends are for executives and supervisors</h1>
        <p className="mt-2 text-gray-600">Switch to the Executive role to see this page.</p>
        <Link href="/" className="mt-6 inline-block rounded-md bg-blue-700 px-4 py-2.5 text-white hover:bg-blue-800">
          Switch role
        </Link>
      </main>
    );
  }

  return <DashboardClient noRole={!role} />;
}
