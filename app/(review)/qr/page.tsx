'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { QUESTION_BY_ID } from '@/components/form/questions';

// /qr — a printable poster per Langs site. Scanning opens the report chat
// with the location already filled in, so staff can report from where they
// are. Print → one poster per page.

const SITES = (QUESTION_BY_ID.q5?.options ?? []).filter((s) => !s.startsWith('Other') && s !== 'Virtual');

interface Poster {
  site: string;
  url: string;
  qr: string; // data URL
}

export default function QrPostersPage() {
  const [posters, setPosters] = useState<Poster[] | null>(null);

  useEffect(() => {
    let live = true;
    const origin = window.location.origin;
    Promise.all(
      SITES.map(async (site) => {
        const url = `${origin}/report/describe?site=${encodeURIComponent(site)}`;
        const qr = await QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: '#0f172a', light: '#ffffff' } });
        return { site, url, qr };
      }),
    ).then((p) => live && setPosters(p));
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:p-0">
      <div className="print:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700">Report from anywhere</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">QR code posters</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          One poster per site. Scanning it opens the report chat with that site already filled in. Print them for
          staff rooms, reception desks and program spaces.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-4 min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Print posters (one per page)
        </button>
      </div>

      {!posters && <p className="mt-6 text-sm text-slate-500 print:hidden">Making QR codes…</p>}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 print:mt-0 print:block">
        {posters?.map((p) => (
          <section
            key={p.site}
            className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center print:h-screen print:break-after-page print:justify-center print:rounded-none print:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">L</span>
              <span className="font-bold text-slate-900">Langs Line</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900 print:text-4xl">Report an incident</h2>
            <p className="text-slate-600 print:text-2xl">{p.site}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL, nothing to optimise */}
            <img src={p.qr} alt={`QR code to report an incident at ${p.site}`} className="mt-4 h-48 w-48 print:h-96 print:w-96" />
            <p className="mt-4 text-sm font-medium text-slate-800 print:text-xl">Scan with your phone camera. Takes about a minute.</p>
            <p className="mt-1 text-xs text-slate-500 print:text-base">You can report anonymously.</p>
            <p className="mt-3 break-all text-[10px] text-slate-400">{p.url}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
