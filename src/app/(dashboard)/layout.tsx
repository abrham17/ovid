import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardShell
      session={{
        name: session.name,
        role: session.role,
        organizationName: session.organizationName,
        partyType: session.partyType,
      }}
    >
      {children}
    </DashboardShell>
  );
}