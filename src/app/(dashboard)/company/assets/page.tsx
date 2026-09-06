import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

import { CompanyAssets } from "./assets-view";

export default async function CompanyAssetsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <CompanyAssets />;
}