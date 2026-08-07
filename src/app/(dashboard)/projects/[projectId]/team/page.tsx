import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  listInvitations,
  listProjectTeam,
} from "@/lib/services/invitation.service";
import { TeamView } from "@/components/projects/views/team-view";
import { canInvite } from "@/lib/permissions";

type Props = { params: Promise<{ projectId: string }> };

export default async function TeamPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [memberships, invitations] = await Promise.all([
    listProjectTeam(session, projectId),
    listInvitations(session, projectId),
  ]);

  return (
    <TeamView
      projectId={projectId}
      memberships={memberships as any}
      invitations={invitations as any}
      canInvite={canInvite(session.role)}
    />
  );
}
