import { db } from "@/lib/db";

export async function getAdminOverviewData() {
  const [organizations, projects, users, memberships] = await Promise.all([
    db.organization.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contractorOrg: { select: { name: true } },
        clientOrg: { select: { name: true } },
      },
    }),
    db.user.findMany({ orderBy: { fullName: "asc" }, include: { organization: true } }),
    db.projectMembership.findMany({
      include: {
        project: { select: { name: true } },
        user: { select: { fullName: true } },
        organization: { select: { name: true } },
      },
    }),
  ]);

  return {
    organizations,
    projects,
    users,
    memberships,
    contractorOrgs: organizations.filter((o) => o.partyType === "CONTRACTOR"),
  };
}
