"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireUser,
  getProjectParty,
  canIssueDocument,
  canApproveDocument,
  canRecordDecision,
  canRecordLessons,
} from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { DocCategory } from "@/generated/prisma/enums";
import { ok, fail, runAction, type ActionResult } from "@/lib/action-result";

async function requireMember(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party) throw new Error("You are not a member of this project.");
  return party;
}

async function saveUpload(file: File | null, projectId: string): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error("File must be under 15 MB.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(process.cwd(), "public", "uploads", projectId);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${safeName}`;
  const fullPath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);
  return `/uploads/${projectId}/${filename}`;
}

const documentSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().optional(),
  docNo: z.string().min(1),
  title: z.string().min(2),
  category: z.enum([
    "DRAWING", "SPECIFICATION", "CONTRACT", "CORRESPONDENCE",
    "PERMIT", "METHOD_STATEMENT", "REPORT", "OTHER",
  ]),
  filePath: z.string().optional(),
  effectiveDate: z.coerce.date().optional(),
});

export async function createDocument(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const file = formData.get("file");
    const uploadedPath =
      file instanceof File ? await saveUpload(file, String(formData.get("projectId") ?? "")) : undefined;

    const parsed = documentSchema.parse({
      projectId: formData.get("projectId"),
      wbsNodeId: formData.get("wbsNodeId") || undefined,
      docNo: formData.get("docNo"),
      title: formData.get("title"),
      category: formData.get("category"),
      filePath: uploadedPath || formData.get("filePath") || undefined,
      effectiveDate: formData.get("effectiveDate") || undefined,
    });
    await requireMember(user, parsed.projectId);
    if (!canIssueDocument(user.role)) {
      return fail("Your role is not authorized to issue documents.");
    }

    const latest = await db.projectDocument.findFirst({
      where: { projectId: parsed.projectId, docNo: parsed.docNo },
      orderBy: { revisionNo: "desc" },
    });
    const revisionNo = latest ? latest.revisionNo + 1 : 1;

    const doc = await db.projectDocument.create({
      data: {
        projectId: parsed.projectId,
        wbsNodeId: parsed.wbsNodeId,
        docNo: parsed.docNo,
        title: parsed.title,
        category: parsed.category as DocCategory,
        revisionNo,
        filePath: parsed.filePath,
        issuedByUserId: user.id,
        effectiveDate: parsed.effectiveDate,
        supersededById: null,
        status: "UNDER_REVIEW",
      },
    });

    // Link the prior revision to this one so DocSupersedeChain is actually
    // traversable (previously `latest.status` was set to SUPERSEDED but
    // `latest.supersededById` was left null, breaking the revision chain).
    if (latest) {
      await db.projectDocument.update({
        where: { id: latest.id },
        data: { status: "SUPERSEDED", supersededById: doc.id },
      });
    }
    await audit({
      userId: user.id,
      entityType: "ProjectDocument",
      entityId: doc.id,
      action: "CREATE",
      diff: { ...parsed, revisionNo },
    });
    revalidatePath(`/projects/${parsed.projectId}/documents`);
    return ok(revisionNo > 1 ? `Revision ${revisionNo} issued.` : "Document created.");
  });
}

export async function approveDocument(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const projectId = String(formData.get("projectId"));
    const documentId = String(formData.get("documentId"));
    const party = await requireMember(user, projectId);
    if (!canApproveDocument(party.partyType, user.role)) {
      return fail("Your role is not authorized to approve documents.");
    }

    await db.projectDocument.update({
      where: { id: documentId },
      data: { status: "ISSUED", approvedById: user.id, effectiveDate: new Date() },
    });
    await audit({
      userId: user.id,
      entityType: "ProjectDocument",
      entityId: documentId,
      action: "APPROVE",
      diff: { status: "ISSUED" },
    });
    revalidatePath(`/projects/${projectId}/documents`);
    return ok("Document approved.");
  });
}

const decisionSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().optional(),
  documentId: z.string().optional(),
  decisionType: z.enum([
    "DESIGN_CHANGE", "DELAY_RULING", "VARIATION_APPROVAL",
    "RESOURCE_ALLOCATION", "SAFETY_STOPPAGE", "OTHER",
  ]),
  decision: z.string().min(3),
  rationale: z.string().optional(),
});

export async function createDecision(formData: FormData) {
  const user = await requireUser();
  const parsed = decisionSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId") || undefined,
    documentId: formData.get("documentId") || undefined,
    decisionType: formData.get("decisionType"),
    decision: formData.get("decision"),
    rationale: formData.get("rationale") || undefined,
  });
  await requireMember(user, parsed.projectId);
  if (!canRecordDecision(user.role)) {
    throw new Error("Your role is not authorized to record decisions.");
  }

  const entry = await db.decisionLog.create({
    data: {
      projectId: parsed.projectId,
      wbsNodeId: parsed.wbsNodeId,
      documentId: parsed.documentId,
      decisionType: parsed.decisionType,
      decision: parsed.decision,
      rationale: parsed.rationale,
      madeByUserId: user.id,
    },
  });
  await audit({ userId: user.id, entityType: "DecisionLog", entityId: entry.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/documents`);
}

const lessonSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().optional(),
  phase: z.string().optional(),
  category: z.string().min(2),
  lesson: z.string().min(3),
  recommendation: z.string().optional(),
});

export async function createLesson(formData: FormData) {
  const user = await requireUser();
  const parsed = lessonSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId") || undefined,
    phase: formData.get("phase") || undefined,
    category: formData.get("category"),
    lesson: formData.get("lesson"),
    recommendation: formData.get("recommendation") || undefined,
  });
  await requireMember(user, parsed.projectId);
  if (!canRecordLessons(user.role)) {
    throw new Error("Your role is not authorized to record lessons learned.");
  }

  const lesson = await db.lessonsLearned.create({
    data: {
      projectId: parsed.projectId,
      wbsNodeId: parsed.wbsNodeId,
      phase: parsed.phase,
      category: parsed.category,
      lesson: parsed.lesson,
      recommendation: parsed.recommendation,
      recordedByUserId: user.id,
    },
  });
  await audit({ userId: user.id, entityType: "LessonsLearned", entityId: lesson.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/documents`);
}