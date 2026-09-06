"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PageHeader } from "@/components/ui/page-header";

import type {
  CompanyContextPayload,
  CompanyRole,
  CompanyTenderRow,
} from "@/lib/types/company";

// ==================================================
// COMPONENT
// ==================================================

export function TenderWorkspace({
  roles,
}: {
  roles: CompanyRole[];
}) {
  // ==================================================
  // STATE
  // ==================================================

  const [rows, setRows] = useState<
    CompanyTenderRow[]
  >([]);

  const [context, setContext] =
    useState<CompanyContextPayload>({
      organizations: [],
      projects: [],
      users: [],
    });

  const [message, setMessage] =
    useState<string>();

  // ==================================================
  // LOAD TENDERS
  // ==================================================

  const load = useCallback(async () => {
    const response = await fetch(
      "/api/company/tenders"
    );

    const data = await response.json();

    if (data.success) {
      setRows(data.data);
    } else {
      setMessage(data.error);
    }
  }, []);

  // ==================================================
  // INITIAL DATA LOAD
  // ==================================================

  useEffect(() => {
    // Load tenders
    void load();

    // Load company context
    void fetch("/api/company/context")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setContext(data.data);
        }
      });
  }, [load]);

  // ==================================================
  // GENERIC POST REQUEST
  // ==================================================

  async function post(body: unknown) {
    const response = await fetch(
      "/api/company/tenders",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (data.success) {
      setMessage("Saved");

      await load();
    } else {
      setMessage(data.error);
    }

    return data;
  }

  // ==================================================
  // CREATE NEW TENDER
  // ==================================================

  async function create(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const formData = new FormData(
      e.currentTarget
    );

    await post({
      bidNo: formData.get("bidNo"),

      title: formData.get("title"),

      amount:
        Number(formData.get("amount")) ||
        undefined,
    });
  }

  // ==================================================
  // PROPOSE PROJECT CONVERSION
  // ==================================================

  async function propose(
    e: React.FormEvent<HTMLFormElement>,
    tenderId: string
  ) {
    e.preventDefault();

    const formData = new FormData(
      e.currentTarget
    );

    await post({
      action: "propose-conversion",

      tenderId,

      proposal: {
        code: formData.get("code"),

        name: formData.get("name"),

        projectType:
          formData.get("projectType"),

        contractType:
          formData.get("contractType"),

        contractValue:
          Number(
            formData.get("contractValue")
          ),

        plannedStartDate:
          formData.get(
            "plannedStartDate"
          ),

        plannedEndDate:
          formData.get(
            "plannedEndDate"
          ),

        clientOrgId:
          formData.get("clientOrgId"),

        consultantOrgId:
          formData.get(
            "consultantOrgId"
          ) || null,
      },
    });
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
        title="Tendering"
        description={`Pre-project bid lifecycle · ${roles.join(
          ", "
        )}`}
      />

      {/* ==================================================
          CREATE NEW TENDER
          ================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            New tender
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={create}
            className="grid gap-3 md:grid-cols-4"
          >

            {/* Bid number */}

            <div>
              <Label>
                Bid number
              </Label>

              <Input
                name="bidNo"
                required
              />
            </div>

            {/* Tender title */}

            <div className="md:col-span-2">
              <Label>
                Title
              </Label>

              <Input
                name="title"
                required
              />
            </div>

            {/* Tender amount */}

            <div>
              <Label>
                Amount
              </Label>

              <Input
                name="amount"
                type="number"
              />
            </div>

            {/* Submit */}

            <Button type="submit">
              Create tender
            </Button>
          </form>

          {/* Result message */}

          {message && (
            <p className="mt-2 text-xs">
              {message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ==================================================
          TENDER LIST
          ================================================== */}

      <div className="space-y-3">

        {rows.map((tender) => (
          <Card key={tender.id}>
            <CardContent className="space-y-3 p-4">

              {/* ==================================================
                  TENDER HEADER
                  ================================================== */}

              <div>
                <b>
                  {tender.bidNo}
                </b>{" "}
                · {tender.title}

                {/* Tender result/status */}

                <select
                  value={tender.result}
                  disabled={
                    Boolean(
                      tender.projectId
                    ) ||
                    !roles.includes(
                      "HEAD_TENDERING"
                    )
                  }
                  onChange={(event) => {
                    const result =
                      event.target.value;

                    // WON must go through
                    // the award workflow below.
                    if (result === "WON") {
                      return;
                    }

                    void post({
                      action: "update",

                      tenderId:
                        tender.id,

                      data: {
                        result,
                      },
                    });
                  }}
                  className="float-right rounded border px-2 py-1"
                >
                  <option value="DRAFT">
                    DRAFT
                  </option>

                  <option value="SUBMITTED">
                    SUBMITTED
                  </option>

                  <option value="WON">
                    WON
                  </option>

                  <option value="LOST">
                    LOST
                  </option>

                  <option value="CANCELLED">
                    CANCELLED
                  </option>
                </select>
              </div>

              {/* ==================================================
                  RECORD TENDER AWARD
                  ================================================== */}

              {roles.includes(
                "HEAD_TENDERING"
              ) &&
                tender.result ===
                  "SUBMITTED" && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();

                      const formData =
                        new FormData(
                          event.currentTarget
                        );

                      void post({
                        action: "update",

                        tenderId:
                          tender.id,

                        data: {
                          result: "WON",

                          supplierOrgId:
                            formData.get(
                              "supplierOrgId"
                            ),
                        },
                      });
                    }}
                    className="flex gap-2 border-t pt-3"
                  >

                    {/* Awarding client */}

                    <select
                      name="supplierOrgId"
                      required
                      className="rounded border px-2"
                    >
                      <option value="">
                        Awarding client…
                      </option>

                      {context.organizations
                        .filter(
                          (organization) =>
                            organization.partyType ===
                            "CLIENT"
                        )
                        .map(
                          (organization) => (
                            <option
                              key={
                                organization.id
                              }
                              value={
                                organization.id
                              }
                            >
                              {
                                organization.name
                              }
                            </option>
                          )
                        )}
                    </select>

                    <Button type="submit">
                      Record award
                    </Button>
                  </form>
                )}

              {/* ==================================================
                  CONVERT WON TENDER INTO PROJECT
                  ================================================== */}

              {tender.result ===
                "WON" &&
                !tender.projectId &&
                roles.includes(
                  "HEAD_TENDERING"
                ) && (
                  <form
                    onSubmit={(event) =>
                      void propose(
                        event,
                        tender.id
                      )
                    }
                    className="grid gap-2 border-t pt-3 md:grid-cols-4"
                  >

                    {/* Project code */}

                    <Input
                      name="code"
                      placeholder="Project code"
                      required
                    />

                    {/* Project name */}

                    <Input
                      name="name"
                      placeholder="Project name"
                      required
                    />

                    {/* Project type */}

                    <select
                      name="projectType"
                      className="rounded border px-2"
                    >
                      <option value="ROAD">
                        ROAD
                      </option>

                      <option value="BUILDING">
                        BUILDING
                      </option>

                      <option value="HOUSING">
                        HOUSING
                      </option>

                      <option value="ENERGY">
                        ENERGY
                      </option>

                      <option value="GREEN_PARK">
                        GREEN_PARK
                      </option>

                      <option value="OTHER">
                        OTHER
                      </option>
                    </select>

                    {/* Contract type */}

                    <select
                      name="contractType"
                      className="rounded border px-2"
                    >
                      <option value="FIDIC_RED">
                        FIDIC_RED
                      </option>

                      <option value="FIDIC_YELLOW">
                        FIDIC_YELLOW
                      </option>

                      <option value="ETHIO_STANDARD">
                        ETHIO_STANDARD
                      </option>

                      <option value="OTHER">
                        OTHER
                      </option>
                    </select>

                    {/* Contract value */}

                    <Input
                      name="contractValue"
                      type="number"
                      placeholder="Contract value"
                      required
                    />

                    {/* Planned start date */}

                    <Input
                      name="plannedStartDate"
                      type="date"
                      required
                    />

                    {/* Planned end date */}

                    <Input
                      name="plannedEndDate"
                      type="date"
                      required
                    />

                    {/* Client */}

                    <select
                      name="clientOrgId"
                      required
                      className="rounded border px-2"
                    >
                      <option value="">
                        Client…
                      </option>

                      {context.organizations
                        .filter(
                          (organization) =>
                            organization.partyType ===
                            "CLIENT"
                        )
                        .map(
                          (organization) => (
                            <option
                              key={
                                organization.id
                              }
                              value={
                                organization.id
                              }
                            >
                              {
                                organization.name
                              }
                            </option>
                          )
                        )}
                    </select>

                    {/* Consultant */}

                    <select
                      name="consultantOrgId"
                      className="rounded border px-2"
                    >
                      <option value="">
                        No consultant
                      </option>

                      {context.organizations
                        .filter(
                          (organization) =>
                            organization.partyType ===
                            "CONSULTANT"
                        )
                        .map(
                          (organization) => (
                            <option
                              key={
                                organization.id
                              }
                              value={
                                organization.id
                              }
                            >
                              {
                                organization.name
                              }
                            </option>
                          )
                        )}
                    </select>

                    {/* Submit project proposal */}

                    <Button type="submit">
                      Send for GM approval
                    </Button>
                  </form>
                )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}