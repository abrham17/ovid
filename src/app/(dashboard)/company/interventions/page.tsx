import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ExecutiveActionsWorkspace } from "./workspace";

export default async function ExecutiveActionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ExecutiveActionsWorkspace currentUserId={session.id} />;
}
