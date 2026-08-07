// components/bulk-invite/bulk-actions.tsx
"use client";

import { useState } from "react";
import { Settings2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import type { BulkInviteController } from "./hooks/useBulkInvite";
import type { BulkActionsPayload } from "./types";
import type { UserRole } from "@/generated/prisma/enums";

interface BulkActionsProps {
  controller: BulkInviteController;
}

type Target = "selected" | "filtered" | "all";

export function BulkActions({ controller }: BulkActionsProps) {
  const { roles, organizations, projects, applyBulk, selectedIds, filteredRows } =
    controller;

  const [open, setOpen] = useState(false);
  const [field, setField] = useState<keyof BulkActionsPayload | null>(null);
  const [target, setTarget] = useState<Target>("selected");
  const [role, setRole] = useState<UserRole>(roles[0] ?? "FOREMAN");
  const [organizationId, setOrganizationId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [projectRole, setProjectRole] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+251");

  const openDialog = (f: keyof BulkActionsPayload) => {
    setField(f);
    setOpen(true);
  };

  const apply = () => {
    if (!field) return;
    const payload: BulkActionsPayload = {};
    if (field === "role") payload.role = role;
    if (field === "organizationId") payload.organizationId = organizationId;
    if (field === "projectId") payload.projectId = projectId;
    if (field === "department") payload.department = department;
    if (field === "jobTitle") payload.jobTitle = jobTitle;
    if (field === "projectRole") payload.projectRole = projectRole;
    if (field === "phonePrefix") payload.phonePrefix = phonePrefix;
    applyBulk(payload, target);
    setOpen(false);
  };

  const targetLabel =
    target === "selected"
      ? `${selectedIds.size} selected`
      : target === "filtered"
        ? `${filteredRows.length} filtered`
        : "all rows";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" />
            Bulk edit
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs">Apply to</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={target}
            onValueChange={(v) => setTarget(v as Target)}
          >
            <DropdownMenuRadioItem value="selected" className="text-xs">
              Selected rows
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="filtered" className="text-xs">
              Filtered rows
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="all" className="text-xs">
              All rows
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs" onSelect={() => openDialog("role")}>
            Set role…
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-xs"
            onSelect={() => openDialog("organizationId")}
          >
            Set organization…
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onSelect={() => openDialog("projectId")}>
            Set project…
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onSelect={() => openDialog("jobTitle")}>
            Set job title…
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onSelect={() => openDialog("department")}>
            Set department…
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-xs"
            onSelect={() => openDialog("projectRole")}
          >
            Set project role…
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-xs"
            onSelect={() => openDialog("phonePrefix")}
          >
            Apply phone prefix…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Bulk edit · {targetLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {field === "role" && (
              <div className="space-y-2">
                <Label className="text-xs">Role</Label>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {field === "organizationId" && (
              <div className="space-y-2">
                <Label className="text-xs">Organization</Label>
                <Select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {field === "projectId" && (
              <div className="space-y-2">
                <Label className="text-xs">Project</Label>
                <Select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {field === "jobTitle" && (
              <div className="space-y-2">
                <Label className="text-xs">Job title</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Site Foreman"
                />
              </div>
            )}
            {field === "department" && (
              <div className="space-y-2">
                <Label className="text-xs">Department</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Operations"
                />
              </div>
            )}
            {field === "projectRole" && (
              <div className="space-y-2">
                <Label className="text-xs">Project role</Label>
                <Input
                  value={projectRole}
                  onChange={(e) => setProjectRole(e.target.value)}
                  placeholder="Team member"
                />
              </div>
            )}
            {field === "phonePrefix" && (
              <div className="space-y-2">
                <Label className="text-xs">Phone prefix</Label>
                <Input
                  value={phonePrefix}
                  onChange={(e) => setPhonePrefix(e.target.value)}
                  placeholder="+251"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={apply}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}