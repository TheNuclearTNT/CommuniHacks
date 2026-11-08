import { DashboardClient } from "@/app/(exec)/dashboard/DashboardClient";

// /portal/trends — reuses the executive dashboard's trends view.
// The portal layout already gates access, so no extra role check here.
export default function PortalTrendsPage() {
  return <DashboardClient noRole={false} />;
}
