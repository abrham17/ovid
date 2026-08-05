"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, getProjectParty } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { WBSNodeType } from "@/generated/prisma/enums";
import { ok, fail, runAction, type ActionResult } from "@/lib/action-result";

const createWbsNodeSchema = z.object({
  projectId: z.string().min(1),
  parentId: z.string().optional(),
  code: z.string().min(1).max(64),
  name: z.string().min(2),
  nodeType: z.enum([
    "PHASE",
    "SECTION",
    "FLOOR",
    "STATION_RANGE",
    "STRUCTURAL_ELEMENT",
    "ACTIVITY",
  ]),
});

const updateWbsNodeSchema = z.object({
  projectId: z.string().min(1),
  nodeId: z.string().min(1),
  parentId: z.string().optional(),
  code: z.string().min(1).max(64),
  name: z.string().min(2),
  nodeType: z.enum([
    "PHASE",
    "SECTION",
    "FLOOR",
    "STATION_RANGE",
    "STRUCTURAL_ELEMENT",
    "ACTIVITY",
  ]),
});

export async function createWbsNode(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = createWbsNodeSchema.parse({
      projectId: formData.get("projectId"),
      parentId: formData.get("parentId") || undefined,
      code: formData.get("code"),
      name: formData.get("name"),
      nodeType: formData.get("nodeType"),
    });

    await ensureContractor(user, parsed.projectId);

    const node = await db.wbsNode.create({
      data: {
        projectId: parsed.projectId,
        parentId: parsed.parentId,
        code: parsed.code,
        name: parsed.name,
        nodeType: parsed.nodeType as WBSNodeType,
      },
    });
    await audit({
      userId: user.id,
      entityType: "WbsNode",
      entityId: node.id,
      action: "CREATE",
      diff: parsed,
    });
    revalidatePath(`/projects/${parsed.projectId}/wbs`);
    return ok("WBS node created.");
  });
}

export async function updateWbsNode(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = updateWbsNodeSchema.parse({
      projectId: formData.get("projectId"),
      nodeId: formData.get("nodeId"),
      parentId: formData.get("parentId") || undefined,
      code: formData.get("code"),
      name: formData.get("name"),
      nodeType: formData.get("nodeType"),
    });

    await ensureContractor(user, parsed.projectId);

    if (parsed.parentId === parsed.nodeId) {
      return fail("A node cannot be its own parent.");
    }
    if (parsed.parentId && (await createsCycle(parsed.nodeId, parsed.parentId))) {
      return fail("This would create a circular WBS hierarchy.");
    }

    const node = await db.wbsNode.update({
      where: { id: parsed.nodeId },
      data: {
        parentId: parsed.parentId || null,
        code: parsed.code,
        name: parsed.name,
        nodeType: parsed.nodeType as WBSNodeType,
      },
    });
    await audit({
      userId: user.id,
      entityType: "WbsNode",
      entityId: node.id,
      action: "UPDATE",
      diff: parsed,
    });
    revalidatePath(`/projects/${parsed.projectId}/wbs`);
    return ok("WBS node updated.");
  });
}

export async function archiveWbsNode(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") ?? "");
    const nodeId = String(formData.get("nodeId") ?? "");
    if (!projectId || !nodeId) return fail("Missing project or node.");

    await ensureContractor(user, projectId);

    const childCount = await db.wbsNode.count({ where: { parentId: nodeId } });
    if (childCount > 0) {
      return fail("Remove or re-parent child nodes before deleting.");
    }

    await db.wbsNode.delete({ where: { id: nodeId } });
    await audit({
      userId: user.id,
      entityType: "WbsNode",
      entityId: nodeId,
      action: "DELETE",
      diff: { projectId, nodeId },
    });
    revalidatePath(`/projects/${projectId}/wbs`);
    return ok("WBS node removed.");
  });
}

/**
 * Walks up from `proposedParentId` toward the root, following parentId.
 * Returns true if `nodeId` appears anywhere in that ancestor chain — i.e.
 * nodeId is an ancestor of proposedParentId, so re-parenting nodeId under
 * proposedParentId would create a cycle (A -> B -> A). The prior code only
 * caught the direct self-parent case (A -> A), not deeper cycles.
 */
async function createsCycle(nodeId: string, proposedParentId: string): Promise<boolean> {
  let currentId: string | null = proposedParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === nodeId) return true;
    if (visited.has(currentId)) return false; // pre-existing cycle elsewhere; not this call's concern
    visited.add(currentId);
    const current: { parentId: string | null } | null = await db.wbsNode.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
  return false;
}

async function ensureContractor(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may modify the WBS.");
  }
  return party;
}