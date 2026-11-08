import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, readSessionValue } from '@/lib/portal/session';

// Gate for everything a reviewer sees (supervisor queue, specialty inbox,
// EA filing, records, trends, follow-ups, QR posters): without a genuine
// sign-in you're sent to the sign-in page, which returns you here afterwards.
// Staff reporting pages stay open.
//
// "Genuine" means the signed session cookie set by /api/portal-login. The old
// plain `portal=1` flag is no longer accepted: anyone could type it into their
// browser. This check only proves the cookie is real; the pages and APIs still
// look the account up in the database. Demo-grade, not production security.

export function proxy(request: NextRequest) {
  if (readSessionValue(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }
  const login = new URL('/portal-login', request.url);
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/supervisor/:path*',
    '/inbox/:path*',
    '/ea/:path*',
    '/records/:path*',
    '/dashboard/:path*',
    '/follow-ups/:path*',
    '/qr/:path*',
  ],
};
