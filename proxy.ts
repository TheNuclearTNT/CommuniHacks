import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Demo gate for everything a reviewer sees (supervisor queue, specialty inbox,
// EA filing, records, trends, follow-ups, QR posters): without the portal
// sign-in cookie (demo password 123) you're sent to the sign-in page, which
// returns you here afterwards. Staff reporting pages stay open.
// This is a demo gate only, not real access control.

export function proxy(request: NextRequest) {
  if (request.cookies.get('portal')?.value === '1') return NextResponse.next();
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
