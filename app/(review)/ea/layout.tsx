import { requireSignedIn } from "@/lib/portal/guard";

// Executive Assistant filing screen: logged-in supervisors / executives only.
export default async function EaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSignedIn();
  return <>{children}</>;
}
