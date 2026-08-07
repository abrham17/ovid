import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listCompliance } from "@/lib/services/compliance.service";
import { ComplianceView } from "@/components/projects/views/compliance-view";
import { can } from "@/lib/permissions";

type Props = { params: Promise<{ projectId: string }> };

export default async function SettingsPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const data = await listCompliance(session, projectId);

  return (
    <ComplianceView
      projectId={projectId}
      reports={data.reports as any}
      decisions={data.decisions as any}
      lessons={data.lessons as any}
      canUpdate={can(session.role, "project", "update")}
    />
  );
}
