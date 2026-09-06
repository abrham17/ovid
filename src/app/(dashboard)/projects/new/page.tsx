import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { ProjectForm } from "./project-form";

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!can(session.role, "project", "create") || session.role === "ADMIN" || session.companyRoles?.length) {
    redirect("/projects");
  }

  // Fetch organizations for the client/consultant dropdowns
  const organizations = await db.organization.findMany({
    where: { partyType: { in: ["CLIENT", "CONSULTANT"] } },
    select: { id: true, name: true, partyType: true },
    orderBy: { name: "asc" },
  });

  return <ProjectForm organizations={organizations} />;
}
