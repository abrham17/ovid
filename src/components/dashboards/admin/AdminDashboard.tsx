import { Building2, FileSearch, FolderKanban, Users } from "lucide-react";
import { DashboardProps, RoleDashboard, makeShortcut, metric } from "@/components/dashboards/dashboard-shell";

export function AdminDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="ADMIN"
      title="Admin Dashboard"
      description="System-wide organizations, users, memberships, projects, and configuration oversight."
      metrics={[
        metric("users", "Active users", "/admin", "good", Users),
        metric("organizations", "Organizations", "/admin", "good", Building2),
        metric("projects", "Projects", "/dashboard", "good", FolderKanban),
        metric("documentsReview", "Docs under review", "documents", "warn", FileSearch),
      ]}
      queueTitle="System Queue"
      queue={["users", "organizations", "projects", "documentsReview"]}
      shortcuts={[
        { href: "/admin", label: "Administration", detail: "Create organizations, users, projects, and memberships." },
        { href: "/dashboard", label: "System Dashboard", detail: "View project metrics and system portfolio." },
        makeShortcut("reports", "Compliance exports", "Generate project-level regulatory reports."),
      ]}
    />
  );
}
