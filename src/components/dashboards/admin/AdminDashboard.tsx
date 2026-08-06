import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/dashboard-shell";

export function AdminDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="ADMIN"
      title="Admin Dashboard"
      description="System-wide organizations, users, memberships, projects, and configuration oversight."
      metrics={[
        metric("users", "Active users", "/admin", "good"),
        metric("organizations", "Organizations", "/admin", "good"),
        metric("projects", "Projects", "/dashboard", "good"),
        metric("documentsReview", "Docs under review", "documents", "warn"),
      ]}
      queueTitle="System Queue"
      queue={["users", "organizations", "projects", "documentsReview"]}
      shortcuts={[
        { href: "/admin", label: "Administration", detail: "Create organizations, users, projects, and memberships." },
        { href: "/team", label: "Team invitations", detail: "Invite users by email instead of setting passwords." },
        { href: "/dashboard", label: "System Dashboard", detail: "View project metrics and system portfolio." },
        makeShortcut("reports", "Compliance exports", "Generate project-level regulatory reports."),
      ]}
    />
  );
}
