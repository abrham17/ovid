import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getPostLoginPath } from "@/lib/rbac/landing";

export default async function Home() {
  const user = await requireUser();
  redirect(await getPostLoginPath(user));
}
