"use client";

import { useRouter } from "next/navigation";

// A simple back control for staff subpages. Uses history back when possible,
// falling back to an explicit href so there's always a way out.
export function BackLink({ href, label = "Back" }: { href?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      className="-ml-2 mb-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-accent hover:bg-blue-50 hover:underline"
    >
      ← {label}
    </button>
  );
}
