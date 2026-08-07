import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPortfolioDashboard } from "@/lib/services/dashboard.service";
import { PortfolioView } from "@/components/portfolio/portfolio-view";

export default async function PortfolioPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getPortfolioDashboard(session);

  return (
    <PortfolioView
      metrics={data.metrics}
      portfolio={data.portfolio as any}
      organizationName={session.organizationName ?? "Ovid Construction"}
    />
  );
}
