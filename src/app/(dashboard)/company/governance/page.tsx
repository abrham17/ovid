import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CompanyGovernanceWorkspace } from "./workspace";

export default async function GovernancePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <CompanyGovernanceWorkspace roles={session.companyRoles ?? []} />;
}
