"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

import type { CompanyContextPayload } from "@/lib/types/company";

// ==================================================
// TYPES
// ==================================================

type TemplateRow = {
  id: string;
  docNo: string;
  revisionNo: number;
  title: string;
};

type FleetRow = {
  id: string;
  equipmentType: string;
  plateNo: string | null;
  serialNo: string | null;
  active: boolean;

  allocations: {
    id: string;
    allocatedFrom: string;
    allocatedTo: string;

    project: {
      code: string;
      name: string;
    };
  }[];
};

// ==================================================
// COMPANY ASSETS COMPONENT
// ==================================================

export function CompanyAssets() {
  const [templates, setTemplates] = useState<
    TemplateRow[]
  >([]);

  const [fleet, setFleet] = useState<FleetRow[]>(
    []
  );

  const [context, setContext] =
    useState<CompanyContextPayload>({
      organizations: [],
      projects: [],
      users: [],
    });

  const [message, setMessage] =
    useState<string>();

  // ==================================================
  // LOAD COMPANY ASSETS AND CONTEXT
  // ==================================================

  const load = () => {
    // ----------------------------------------------
    // Load controlled document templates
    // ----------------------------------------------

    fetch("/api/company/assets?kind=templates")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setTemplates(data.data);
        }
      });

    // ----------------------------------------------
    // Load company fleet
    // ----------------------------------------------

    fetch("/api/company/assets?kind=fleet")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setFleet(data.data);
        }
      });

    // ----------------------------------------------
    // Load company context
    // ----------------------------------------------

    fetch("/api/company/context")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setContext(data.data);
        }
      });
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    load();
  }, []);

  // ==================================================
  // SUBMIT ASSET REQUEST
  // ==================================================

  async function submit(
    e: React.FormEvent<HTMLFormElement>,
    kind: string
  ) {
    e.preventDefault();

    const formData = new FormData(
      e.currentTarget
    );

    const response = await fetch(
      "/api/company/assets",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          kind,
          ...Object.fromEntries(formData),
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      setMessage(
        "Submitted for company approval"
      );

      load();
    } else {
      setMessage(data.error);
    }
  }

  // ==================================================
  // ALLOCATE EQUIPMENT
  // ==================================================

  async function allocate(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const formData = new FormData(
      e.currentTarget
    );

    const response = await fetch(
      "/api/company/governance",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "allocate-equipment",
          ...Object.fromEntries(formData),
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      setMessage("Equipment allocated");

      load();
    } else {
      setMessage(data.error);
    }
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* ==================================================
          PAGE HEADER
          ================================================== */}

      <PageHeader
        title="Company Standards & Fleet"
        description="Design templates, fleet allocation and capital governance"
      />

      {/* ==================================================
          MESSAGE
          ================================================== */}

      {message && (
        <p className="text-sm">
          {message}
        </p>
      )}

      {/* ==================================================
          MAIN CONTENT
          ================================================== */}

      <div className="grid gap-4 lg:grid-cols-2">

        {/* ==================================================
            CONTROLLED TEMPLATE
            ================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              New controlled template
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={(e) =>
                void submit(e, "template")
              }
              className="space-y-2"
            >
              {/* Document number */}

              <Input
                name="docNo"
                placeholder="Document number"
                required
              />

              {/* Document title */}

              <Input
                name="title"
                placeholder="Title"
                required
              />

              {/* Issuing department */}

              <select
                name="issuingDepartment"
                className="h-10 w-full rounded border px-2"
              >
                <option value="ENG">
                  ENG
                </option>

                <option value="QC">
                  QC
                </option>

                <option value="HSE">
                  HSE
                </option>

                <option value="FINANCE">
                  FINANCE
                </option>

                <option value="CONTRACTS">
                  CONTRACTS
                </option>
              </select>

              {/* Revision number */}

              <Input
                name="revisionNo"
                type="number"
                defaultValue="1"
                required
              />

              {/* Effective date */}

              <Input
                name="effectiveDate"
                type="date"
                required
              />

              {/* Submit */}

              <Button type="submit">
                Create and request approval
              </Button>
            </form>

            {/* Existing templates */}

            <div className="mt-4 text-xs">
              {templates.map((template) => (
                <p key={template.id}>
                  {template.docNo} rev{" "}
                  {template.revisionNo} ·{" "}
                  {template.title}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ==================================================
            EQUIPMENT CAPITAL REQUEST
            ================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Equipment capital request
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={(e) =>
                void submit(e, "equipment")
              }
              className="space-y-2"
            >
              {/* Action */}

              <select
                name="action"
                className="h-10 w-full rounded border px-2"
              >
                <option value="ACQUIRE">
                  ACQUIRE
                </option>

                <option value="DISPOSE">
                  DISPOSE
                </option>
              </select>

              {/* Equipment type */}

              <Input
                name="equipmentType"
                placeholder="Equipment type"
                required
              />

              {/* Existing equipment ID */}

              <Input
                name="equipmentId"
                placeholder="Existing equipment ID for disposal"
              />

              {/* Plate number */}

              <Input
                name="plateNo"
                placeholder="Plate number"
              />

              {/* Serial number */}

              <Input
                name="serialNo"
                placeholder="Serial number"
              />

              {/* Capital value */}

              <Input
                name="amount"
                type="number"
                placeholder="Capital value"
                required
              />

              {/* Submit */}

              <Button type="submit">
                Submit capital request
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ==================================================
            CENTRAL FLEET ALLOCATION
            ================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Allocate central fleet
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={allocate}
              className="space-y-2"
            >
              {/* Equipment */}

              <select
                name="equipmentId"
                required
                className="h-10 w-full rounded border px-2"
              >
                <option value="">
                  Equipment…
                </option>

                {fleet
                  .filter(
                    (equipment) =>
                      equipment.active
                  )
                  .map((equipment) => (
                    <option
                      key={equipment.id}
                      value={equipment.id}
                    >
                      {equipment.equipmentType} ·{" "}
                      {equipment.plateNo ??
                        equipment.serialNo ??
                        equipment.id}
                    </option>
                  ))}
              </select>

              {/* Project */}

              <select
                name="projectId"
                required
                className="h-10 w-full rounded border px-2"
              >
                <option value="">
                  Project…
                </option>

                {context.projects.map(
                  (project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.code} ·{" "}
                      {project.name}
                    </option>
                  )
                )}
              </select>

              {/* Allocation start */}

              <Input
                name="allocatedFrom"
                type="date"
                required
              />

              {/* Allocation end */}

              <Input
                name="allocatedTo"
                type="date"
                required
              />

              {/* Purpose */}

              <Input
                name="purpose"
                placeholder="Purpose"
                required
              />

              {/* Submit */}

              <Button type="submit">
                Allocate
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ==================================================
            FLEET STATUS
            ================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Fleet status
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2 text-xs">
            {fleet.map((equipment) => (
              <div
                key={equipment.id}
                className="rounded border p-2"
              >
                {/* Equipment summary */}

                <b>
                  {equipment.equipmentType}
                </b>

                {" · "}

                {equipment.plateNo ??
                  equipment.serialNo ??
                  equipment.id}

                {" · "}

                {equipment.active
                  ? "Active"
                  : "Disposed"}

                {/* Equipment allocations */}

                {equipment.allocations.map(
                  (allocation) => (
                    <p key={allocation.id}>
                      {allocation.project.code} ·{" "}
                      {allocation.allocatedFrom.slice(
                        0,
                        10
                      )}{" "}
                      to{" "}
                      {allocation.allocatedTo.slice(
                        0,
                        10
                      )}
                    </p>
                  )
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}