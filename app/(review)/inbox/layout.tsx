import { requireSignedIn } from "@/lib/portal/guard";

// Specialty acknowledgement inbox: logged-in supervisors / executives only.
export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSignedIn();
  return <>{children}</>;
}
