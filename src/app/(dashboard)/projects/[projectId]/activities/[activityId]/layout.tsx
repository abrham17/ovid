import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertScopeVisible, getEffectiveScope } from "@/lib/scope";

/** Enforce Layer 1 × Layer 3 scope before any activity detail child can load. */
export default async function ScopedActivityLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string; activityId: string }> }) {
  const session = await getSession();
  if (!session) notFound();
  const { projectId, activityId } = await params;
  const activity = await db.scheduleActivity.findUnique({ where: { id: activityId }, select: { wbsNodeId: true, wbsNode: { select: { projectId: true } } } });
  if (!activity || activity.wbsNode.projectId !== projectId) notFound();
  const scope = await getEffectiveScope(session, projectId);
  assertScopeVisible(scope, activity.wbsNodeId);
  return children;
}
