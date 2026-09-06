import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import {
  listCompanyStaff,
  listCompanyInvitations,
} from "@/lib/services/company.service";

import { db } from "@/lib/db";

import { CompanyStaffManager } from "./staff-manager";

// ==================================================
// COMPANY STAFF PAGE
// ==================================================

export default async function CompanyStaffPage() {
  // ==================================================
  // GET CURRENT SESSION
  // ==================================================

  const session = await getSession();

  // ==================================================
  // AUTHENTICATION CHECK
  // ==================================================

  if (!session) {
    redirect("/login");
  }

  // ==================================================
  // AUTHORIZATION CHECK
  // Only ADMIN can manage company staff
  // ==================================================

  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // ==================================================
  // LOAD COMPANY STAFF DATA
  // ==================================================

  const [assignments, invitations, users] =
    await Promise.all([
      // Current and historical staff assignments
      listCompanyStaff(session),

      // Staff invitation history
      listCompanyInvitations(session),

      // Active organization users
      db.user.findMany({
        where: {
          organizationId:
            session.organizationId,

          active: true,

          // Do not include the currently
          // logged-in administrator
          id: {
            not: session.id,
          },
        },

        // Only fetch the fields required
        // by the staff management UI
        select: {
          id: true,
          fullName: true,
          email: true,
          jobTitle: true,
        },

        // Sort users alphabetically
        orderBy: {
          fullName: "asc",
        },
      }),
    ]);

  // ==================================================
  // RENDER STAFF MANAGEMENT UI
  // ==================================================

  return (
    <CompanyStaffManager
      initialAssignments={assignments}
      initialInvitations={invitations}
      organizationUsers={users}
    />
  );
}