import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listProcurement } from "@/lib/services/procurement.service";
import { ProcurementView } from "@/components/projects/views/procurement-view";
import { can } from "@/lib/permissions";
import { getScopeUiHints } from "@/lib/scope-ui";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProcurementPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [data, hints] = await Promise.all([
    listProcurement(session, projectId),
    getScopeUiHints(session, projectId),
  ]);

  const canWriteProcurement =
    hints.scope.scopeMode === "procurement_own" || hints.hasWritableScope;

  return (
    <ProcurementView
      projectId={projectId}
      purchaseOrders={data.purchaseOrders as any}
      bids={data.bids as any}
      materials={data.materials as any}
      receipts={data.receipts as any}
      suppliers={data.suppliers as any}
      canCreate={can(session.role, "procurement", "create") && canWriteProcurement}
      canApprove={
        can(session.role, "procurement", "approve") &&
        (hints.scope.scopeMode === "procurement_own" || hints.hasVisibleScope)
      }
      scopeBanner={
        hints.scope.scopeMode === "procurement_own"
          ? "Showing only purchase orders and receipts for your organization."
          : hints.banner
      }
      scopeEmptyTitle={
        hints.scope.scopeMode === "procurement_own" ? null : hints.emptyTitle
      }
      scopeEmptyDescription={
        hints.scope.scopeMode === "procurement_own" ? null : hints.emptyDescription
      }
    />
  );
}
