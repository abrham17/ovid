import { requireUser } from "@/lib/rbac";
import { canInviteUsers, inviteableRolesFor } from "@/lib/rbac/invitations";
import { getTeamPageData } from "@/lib/services/team.service";
import { SectionCard } from "@/components/section-card";
import { InviteUserForm } from "@/components/team/invite-user-form";
import { InvitationsTable } from "@/components/team/invitations-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TeamPage() {
  const user = await requireUser();
  const allowed = canInviteUsers(user.role);

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team invitations</CardTitle>
          <CardDescription>Your role cannot manage team invitations.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Ask a Senior PM, Deputy PM, HR, Superintendent, or Admin to invite colleagues.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { invitations, organizations, projects } = await getTeamPageData(user);
  const roles = inviteableRolesFor(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Team</h1>
        <p className="mt-1 text-sm text-slate-500">
          Invite lower-level workers to your organization. They receive an email link to set a password.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <SectionCard title="Send invitation" description="Email a join link that expires in 7 days.">
          <InviteUserForm
            roles={roles}
            organizations={organizations}
            projects={projects}
            isAdmin={user.role === "ADMIN"}
            defaultOrganizationId={user.organizationId}
          />
        </SectionCard>

        <SectionCard
          title="Invitations"
          description="Pending, accepted, expired, and revoked invites for your organization."
        >
          <InvitationsTable invitations={invitations} />
        </SectionCard>
      </div>
    </div>
  );
}
