import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PortalNav } from "./PortalNav";

// Wraps every /portal/* page EXCEPT the login page (which lives at
// /portal/login and is outside this check because it needs to render without
// the cookie). The gate is demo-only.
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const signedIn = (await cookies()).get("portal")?.value === "1";
  if (!signedIn) {
    redirect("/portal-login");
  }

  return (
    <div className="min-h-screen bg-white">
      <PortalNav />
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </div>
  );
}
