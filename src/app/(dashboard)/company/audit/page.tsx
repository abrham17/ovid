import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCompanyRole } from "@/lib/permissions";

export default async function AuditPage() {
  // ==================================================
  // AUTHENTICATION
  // ==================================================

  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // ==================================================
  // AUTHORIZATION
  // ==================================================

  const isInternalAuditor = await hasCompanyRole(
    user,
    "INTERNAL_AUDITOR"
  );

  const isGeneralManager = await hasCompanyRole(
    user,
    "GENERAL_MANAGER"
  );

  if (!isInternalAuditor && !isGeneralManager) {
    redirect("/dashboard");
  }

  // ==================================================
  // PROJECT SCOPE
  // ==================================================
  // Only include projects where the user's organization
  // is acting as contractor, client, or consultant.
  // ==================================================

  const projectScope = {
    OR: [
      {
        contractorOrgId: user.organizationId,
      },
      {
        clientOrgId: user.organizationId,
      },
      {
        consultantOrgId: user.organizationId,
      },
    ],
  };

  // ==================================================
  // LOAD AUDIT & COMPLIANCE DATA
  // ==================================================

  const [
    logs,
    signoffs,
    reports,
    contracts,
    risks,
    purchaseOrders,
    financials,
  ] = await Promise.all([
    // ----------------------------------------------
    // Audit logs
    // ----------------------------------------------

    db.auditLog.findMany({
      where: {
        user: {
          organizationId: user.organizationId,
        },
      },

      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },

      orderBy: {
        changedAt: "desc",
      },

      take: 100,
    }),

    // ----------------------------------------------
    // Sign-offs
    // ----------------------------------------------

    db.signOff.findMany({
      where: {
        user: {
          organizationId: user.organizationId,
        },
      },

      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },

      orderBy: {
        signedAt: "desc",
      },

      take: 100,
    }),

    // ----------------------------------------------
    // Regulatory reports
    // ----------------------------------------------

    db.regulatoryReport.findMany({
      where: {
        project: projectScope,
      },

      include: {
        project: {
          select: {
            code: true,
            name: true,
          },
        },
      },

      orderBy: {
        generatedAt: "desc",
      },

      take: 100,
    }),

    // ----------------------------------------------
    // Contracts
    // ----------------------------------------------

    db.contract.findMany({
      where: {
        project: projectScope,
      },

      include: {
        project: {
          select: {
            code: true,
          },
        },

        contractorOrg: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },

      take: 50,
    }),

    // ----------------------------------------------
    // Open and mitigating risks
    // ----------------------------------------------

    db.riskEntry.findMany({
      where: {
        project: projectScope,

        status: {
          in: [
            "OPEN",
            "MITIGATING",
          ],
        },
      },

      include: {
        project: {
          select: {
            code: true,
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },

      take: 50,
    }),

    // ----------------------------------------------
    // Purchase orders
    // ----------------------------------------------

    db.purchaseOrder.findMany({
      where: {
        project: projectScope,
      },

      include: {
        project: {
          select: {
            code: true,
          },
        },

        supplier: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },

      take: 50,
    }),

    // ----------------------------------------------
    // Certified and paid measurements / IPCs
    // ----------------------------------------------

    db.measurementEntry.findMany({
      where: {
        wbsNode: {
          project: projectScope,
        },

        status: {
          in: [
            "CERTIFIED",
            "PAID",
          ],
        },
      },

      include: {
        wbsNode: {
          select: {
            project: {
              select: {
                code: true,
              },
            },
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },

      take: 50,
    }),
  ]);

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* ==================================================
          PAGE HEADER
          ================================================== */}

      <PageHeader
        title="Audit & Compliance"
        description="Read-only organization-wide evidence"
      />

      {/* ==================================================
          AUDIT & COMPLIANCE CARDS
          ================================================== */}

      <div className="grid gap-4 lg:grid-cols-3">

        {/* ==================================================
            AUDIT EVENTS
            ================================================== */}

        <Card>
          <CardContent className="space-y-2 p-4">
            <b>
              Audit events
            </b>

            {logs.map((log) => (
              <p
                className="text-xs"
                key={log.id}
              >
                {log.action}{" "}
                {log.entityType} ·{" "}
                {log.user.fullName}
              </p>
            ))}
          </CardContent>
        </Card>

        {/* ==================================================
            SIGN-OFFS
            ================================================== */}

        <Card>
          <CardContent className="space-y-2 p-4">
            <b>
              Sign-offs
            </b>

            {signoffs.map((signoff) => (
              <p
                className="text-xs"
                key={signoff.id}
              >
                {signoff.signOffRole} ·{" "}
                {signoff.user.fullName}
              </p>
            ))}
          </CardContent>
        </Card>

        {/* ==================================================
            REGULATORY REPORTS
            ================================================== */}

        <Card>
          <CardContent className="space-y-2 p-4">
            <b>
              Regulatory reports
            </b>

            {reports.map((report) => (
              <p
                className="text-xs"
                key={report.id}
              >
                {report.project.code} ·{" "}
                {report.reportType}
              </p>
            ))}
          </CardContent>
        </Card>

        {/* ==================================================
            CONTRACTS
            ================================================== */}

        <Card>
          <CardContent className="space-y-2 p-4">
            <b>
              Contracts
            </b>

            {contracts.map((contract) => (
              <p
                className="text-xs"
                key={contract.id}
              >
                {contract.project.code} ·{" "}
                {contract.contractorOrg.name} ·{" "}
                {contract.status}
              </p>
            ))}
          </CardContent>
        </Card>

        {/* ==================================================
            OPEN RISKS
            ================================================== */}

        <Card>
          <CardContent className="space-y-2 p-4">
            <b>
              Open risks
            </b>

            {risks.map((risk) => (
              <p
                className="text-xs"
                key={risk.id}
              >
                {risk.project.code} ·{" "}
                {risk.description}
              </p>
            ))}
          </CardContent>
        </Card>

        {/* ==================================================
            PROCUREMENT
            ================================================== */}

        <Card>
          <CardContent className="space-y-2 p-4">
            <b>
              Procurement
            </b>

            {purchaseOrders.map(
              (purchaseOrder) => (
                <p
                  className="text-xs"
                  key={purchaseOrder.id}
                >
                  {purchaseOrder.project.code} ·{" "}
                  {purchaseOrder.poNo} ·{" "}
                  {purchaseOrder.supplier.name} ·{" "}
                  {purchaseOrder.status}
                </p>
              )
            )}
          </CardContent>
        </Card>

        {/* ==================================================
            CERTIFIED AND PAID IPCs
            ================================================== */}

        <Card>
          <CardContent className="space-y-2 p-4">
            <b>
              Certified and paid IPCs
            </b>

            {financials.map((entry) => (
              <p
                className="text-xs"
                key={entry.id}
              >
                {entry.wbsNode.project.code} ·{" "}
                {entry.certificateNo ??
                  entry.itemNo}{" "}
                · {entry.status}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}