import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPortfolioDashboard } from "@/lib/services/dashboard.service";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { canCompany } from "@/lib/permissions";

export default async function PortfolioPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Executive portfolio dashboard is strictly for corporate roles with portfolio read permission
  const canAccessPortfolio =
    session.role === "ADMIN" ||
    (await canCompany(session, "portfolio", "read"));

  if (!canAccessPortfolio) {
    redirect("/projects");
  }

  const data = await getPortfolioDashboard(session);

  return (
    <PortfolioView
      metrics={data.metrics}
      portfolio={data.portfolio as any}
      organizationName={session.organizationName ?? "Ovid Construction"}
    />
  );
}
