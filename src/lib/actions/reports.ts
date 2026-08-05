"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { requireUser, getProjectParty, canGenerateReport, canAccessReportType, canSeeMargin } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { PartyType } from "@/generated/prisma/enums";

const reportSchema = z.object({
  projectId: z.string().min(1),
  reportType: z.enum(["GRADING_RENEWAL", "PROGRESS_SUBMISSION", "SAFETY_COMPLIANCE", "OTHER"]),
  format: z.enum(["json", "csv"]).default("json"),
});

export async function generateReport(formData: FormData) {
  const user = await requireUser();
  const parsed = reportSchema.parse({
    projectId: formData.get("projectId"),
    reportType: formData.get("reportType"),
    format: formData.get("format") || "json",
  });
  const party = await getProjectParty(user, parsed.projectId);
  if (!party || !canGenerateReport(user.role)) {
    throw new Error("Your role is not authorized to generate compliance reports.");
  }
  // Party-level gate (file 09 §2): GRADING_RENEWAL exposes the contractor's
  // license/tax ID and staffing/equipment counts — company data, not
  // project data — so a CONSULTANT_ENGINEER passing canGenerateReport's
  // role check must still be blocked here.
  if (!canAccessReportType(party.partyType, parsed.reportType)) {
    throw new Error("This report type is not available to your organization's party role.");
  }

  const payload = await buildReportPayload(parsed.projectId, parsed.reportType, party.partyType);
  const body = parsed.format === "csv" ? toCsv(payload) : JSON.stringify(payload, null, 2);

  const report = await db.regulatoryReport.create({
    data: {
      projectId: parsed.projectId,
      reportType: parsed.reportType,
      filePath: "", // placeholder, filled after file write
    },
  });

  const dir = path.join(process.cwd(), "public", "exports");
  mkdirSync(dir, { recursive: true });
  const filename = `${parsed.reportType.toLowerCase()}-${report.id.slice(0, 8)}.${parsed.format}`;
  writeFileSync(path.join(dir, filename), body, "utf8");
  const filePath = `/exports/${filename}`;

  await db.regulatoryReport.update({ where: { id: report.id }, data: { filePath } });
  await audit({ userId: user.id, entityType: "RegulatoryReport", entityId: report.id, action: "CREATE", diff: { ...parsed, filePath } });
  revalidatePath(`/projects/${parsed.projectId}/reports`);
}

async function buildReportPayload(projectId: string, reportType: string, partyType: PartyType) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      contractorOrg: true,
      clientOrg: true,
      consultantOrg: true,
      wbsNodes: { include: { boqItems: true, activities: true } },
    },
  });
  if (!project) throw new Error("Project not found.");

  const measurements = await db.measurementEntry.findMany({ where: { wbsNode: { projectId } } });
  const costActuals = await db.costActual.findMany({ where: { boqItem: { wbsNode: { projectId } } } });
  const incidents = await db.safetyIncident.findMany({ where: { wbsNode: { projectId } } });
  const observations = await db.safetyObservation.findMany({ where: { wbsNode: { projectId } } });

  const generatedAt = new Date().toISOString();

  if (reportType === "GRADING_RENEWAL") {
    const org = project.contractorOrg;
    return {
      report: "GRADING_RENEWAL",
      generatedAt,
      organization: {
        name: org.name,
        nameAmharic: org.nameAmharic,
        licenseNumber: org.licenseNumber,
        taxId: org.taxId,
        contractorGrade: org.contractorGrade,
      },
      projects: [
        {
          code: project.code,
          name: project.name,
          status: project.status,
          contractValue: Number(project.contractValue),
          type: project.projectType,
          plannedEnd: project.plannedEndDate.toISOString(),
        },
      ],
      staffing: { employees: await db.employee.count({ where: { organizationId: org.id, active: true } }) },
      equipment: { units: await db.equipment.count({ where: { organizationId: org.id, active: true } }) },
    };
  }

  if (reportType === "SAFETY_COMPLIANCE") {
    return {
      report: "SAFETY_COMPLIANCE",
      generatedAt,
      project: project.code,
      observations: observations.map((o) => ({
        hazard: o.hazardDescription,
        severity: o.severity,
        observedAt: o.observedAt.toISOString(),
      })),
      incidents: incidents.map((i) => ({
        type: i.incidentType,
        status: i.status,
        description: i.description,
      })),
      openIncidents: incidents.filter((i) => i.status === "OPEN").length,
    };
  }

  // PROGRESS_SUBMISSION / OTHER — EVM-style rollup by WBS node.
  // Internal cost breakdown (budget, actual) is the "single most important
  // visibility boundary in the whole system" per file 09 §2: only the
  // contractor sees it. Consultant/Client only ever see certified/earned
  // value and payment status, never the underlying budgeted unit rates or
  // committed/actual spend — so an export must respect the same boundary
  // the UI does, not just dump full cost data to whoever can hit "Generate".
  const showCostBreakdown = canSeeMargin(partyType);
  const rows = project.wbsNodes.map((node) => {
    const budget = node.boqItems.reduce((s, b) => s + Number(b.budgetedQuantity) * Number(b.unitRate), 0);
    const nodeMeasurements = measurements.filter((m) => m.wbsNodeId === node.id && (m.status === "CERTIFIED" || m.status === "PAID"));
    const earned = nodeMeasurements.reduce((s, m) => s + Number(m.quantity) * Number(m.unitRate), 0);
    const nodeActuals = costActuals.filter((c) => node.boqItems.some((b) => b.id === c.boqItemId));
    const actual = nodeActuals.reduce((s, c) => s + Number(c.amount), 0);
    const progress = node.activities.length
      ? node.activities.reduce((s, a) => s + Number(a.progressPercent), 0) / node.activities.length
      : 0;
    const base = { code: node.code, name: node.name, earned, progressPct: Math.round(progress) };
    return showCostBreakdown ? { ...base, budget, actual } : base;
  });
  return { report: reportType, generatedAt, project: project.code, generatedBy: "Ovid PMS", rows };
}

function toCsv(payload: Record<string, unknown>): string {
  const rows = Array.isArray(payload.rows) ? (payload.rows as Record<string, unknown>[]) : [];
  if (rows.length === 0) return JSON.stringify(payload, null, 2);
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","));
  }
  return lines.join("\n");
}