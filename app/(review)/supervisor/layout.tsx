import { requireSignedIn } from "@/lib/portal/guard";

// Supervisor queue and review screens: logged-in supervisors / executives only.
export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSignedIn();
  return <>{children}</>;
}
