import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listProcurement } from "@/lib/services/procurement.service";
import { ProcurementView } from "@/components/projects/views/procurement-view";
import { can } from "@/lib/permissions";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProcurementPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const data = await listProcurement(session, projectId);

  return (
    <ProcurementView
      projectId={projectId}
      purchaseOrders={data.purchaseOrders as any}
      bids={data.bids as any}
      materials={data.materials as any}
      receipts={data.receipts as any}
      suppliers={data.suppliers as any}
      canCreate={can(session.role, "procurement", "create")}
      canApprove={can(session.role, "procurement", "approve")}
    />
  );
}
