import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TenderWorkspace } from "./tender-workspace";
export default async function TendersPage() { 
    const s = await getSession(); 
    if (!s) 
        redirect("/login");
    return <TenderWorkspace roles={s.companyRoles ?? []} />; 
}
