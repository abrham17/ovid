import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/rbac";
import { canInviteUsers } from "@/lib/rbac/invitations";

export async function getTeamPageData(user: SessionUser) {
  if (!canInviteUsers(user.role)) {
    return { invitations: [], organizations: [], projects: [] };
  }

  const organizationFilter =
    user.role === "ADMIN" ? {} : { organizationId: user.organizationId };

  const [invitations, organizations, projects] = await Promise.all([
    db.invitation.findMany({
      where: organizationFilter,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        invitedBy: { select: { fullName: true } },
        organization: { select: { id: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    }),
    user.role === "ADMIN"
      ? db.organization.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, partyType: true },
        })
      : Promise.resolve([
          {
            id: user.organizationId,
            name: user.organizationName,
            partyType: user.partyType,
          },
        ]),
    db.project.findMany({
      where:
        user.role === "ADMIN"
          ? undefined
          : {
              OR: [
                { contractorOrgId: user.organizationId },
                { clientOrgId: user.organizationId },
                { consultantOrgId: user.organizationId },
                { memberships: { some: { organizationId: user.organizationId } } },
              ],
            },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
      take: 100,
    }),
  ]);

  return { invitations, organizations, projects };
}
