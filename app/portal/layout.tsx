import { requireSignedIn } from "@/lib/portal/guard";
import { PortalNav } from "./PortalNav";

// Wraps every /portal/* page. Logged-out visitors are sent to /portal-login
// (which lives outside this layout so it can render without a session).
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSignedIn();

  return (
    <div className="min-h-screen bg-white">
      <PortalNav />
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </div>
  );
}
