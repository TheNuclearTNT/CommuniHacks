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
      className="mb-4 inline-flex items-center text-sm text-accent hover:underline"
    >
      ← {label}
    </button>
  );
}
