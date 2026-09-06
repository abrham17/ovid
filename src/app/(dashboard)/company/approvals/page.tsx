import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

import { CompanyApprovals } from "./approvals-view";

export default async function CompanyApprovalsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <CompanyApprovals />;
}