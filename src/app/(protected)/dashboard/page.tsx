import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { dashboardRegistry } from "@/lib/rbac/dashboardRegistry";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const Dashboard = dashboardRegistry[user.role];

  if (!Dashboard) redirect("/login");

  return (
    <Dashboard
      userId={user.id}
      organizationId={user.organizationId}
      partyType={user.partyType}
      organizationName={user.organizationName}
    />
  );
}
