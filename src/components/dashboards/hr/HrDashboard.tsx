import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/dashboard-shell";

export function HrDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="HR"
      title="HR Dashboard"
      description="Workforce roster, attendance, assignment pressure, and labor visibility for active projects."
      metrics={[
        metric("laborAssignments", "Labor assignments", "resources", "good"),
        metric("projects", "Visible projects", undefined, "good"),
        metric("openIncidents", "Open safety incidents", "safety", "bad"),
        metric("pendingDaily", "Daily reports in chain", "daily", "warn"),
      ]}
      queueTitle="Workforce Queue"
      queue={["laborAssignments", "projects", "openIncidents", "pendingDaily"]}
      shortcuts={[
        { href: "/team", label: "Invite team", detail: "Send email invitations to join your organization." },
        makeShortcut("resources", "Labor records", "Maintain employees, attendance, and task assignment."),
        makeShortcut("daily", "Daily context", "Review reports that affect labor planning."),
        makeShortcut("safety", "Safety impact", "See incidents affecting workforce availability."),
      ]}
    />
  );
}
