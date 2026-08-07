// components/bulk-invite/spreadsheet-editor.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type ColumnResizeMode,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Check,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type { InviteRow, RowStatus } from "./types";
import type { BulkInviteController } from "./hooks/useBulkInvite";
import { RowActions } from "./row-actions";
import { deriveNameFromEmail } from "./lib/validation";

interface SpreadsheetEditorProps {
  controller: BulkInviteController;
}

function StatusBadge({ status, errors, warnings }: {
  status: RowStatus;
  errors: string[];
  warnings: string[];
}) {
  const issues = [...errors, ...warnings];
  const config = {
    ready: {
      icon: Check,
      label: "Ready",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    warning: {
      icon: AlertTriangle,
      label: "Warning",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    error: {
      icon: X,
      label: "Error",
      className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    },
    duplicate: {
      icon: AlertTriangle,
      label: "Duplicate",
      className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    },
    existing: {
      icon: AlertTriangle,
      label: "Exists",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    },
  }[status];

  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "h-6 gap-1 px-1.5 text-[10px] font-medium cursor-default",
              config.className
            )}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        {issues.length > 0 && (
          <TooltipContent side="right" className="max-w-xs">
            <ul className="space-y-1 text-xs">
              {issues.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function EditableCell({
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  className,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  className?: string;
  hasError?: boolean;
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={cn(
        "h-8 border-transparent bg-transparent px-2 text-sm shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:ring-1",
        hasError && "border-red-300 bg-red-50 dark:bg-red-950/30",
        className
      )}
    />
  );
}

export function SpreadsheetEditor({ controller }: SpreadsheetEditorProps) {
  const {
    filteredRows,
    selectedIds,
    setSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    updateRow,
    removeRows,
    roles,
    organizations,
    projects,
    undo,
    redo,
  } = controller;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const parentRef = useRef<HTMLDivElement>(null);

  // Sync selection with controller
  useEffect(() => {
    const next: RowSelectionState = {};
    for (const id of selectedIds) {
      next[id] = true;
    }
    setRowSelection(next);
  }, [selectedIds]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const columns = useMemo<ColumnDef<InviteRow, unknown>[]>(
    () => [
      {
        id: "select",
        size: 40,
        enableResizing: false,
        header: ({ table }: { table: any }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value: boolean | string) => {
              if (value) {
                selectAll(filteredRows.map((r) => r.id));
              } else {
                clearSelection();
              }
            }}
            aria-label="Select all"
            className="translate-y-[1px]"
          />
        ),
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            aria-label="Select row"
            className="translate-y-[1px]"
          />
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        size: 100,
        header: "Status",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <StatusBadge
            status={row.original.status}
            errors={row.original.errors}
            warnings={row.original.warnings}
          />
        ),
      },
      {
        id: "fullName",
        accessorKey: "fullName",
        size: 160,
        header: "Full name",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <EditableCell
            value={row.original.fullName}
            onChange={(v) => updateRow(row.original.id, { fullName: v })}
            placeholder="Full name"
            hasError={row.original.errors.some((e: string) => e.includes("name"))}
          />
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        size: 200,
        header: "Email",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <EditableCell
            value={row.original.email}
            onChange={(v) => {
              const patch: Partial<InviteRow> = { email: v };
              if (!row.original.fullName.trim() && v.includes("@")) {
                patch.fullName = deriveNameFromEmail(v);
              }
              updateRow(row.original.id, patch);
            }}
            placeholder="email@company.com"
            type="email"
            hasError={row.original.errors.some((e: string) => e.toLowerCase().includes("email"))}
          />
        ),
      },
      {
        id: "phone",
        accessorKey: "phone",
        size: 130,
        header: "Phone",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <EditableCell
            value={row.original.phone}
            onChange={(v) => updateRow(row.original.id, { phone: v })}
            placeholder="+251…"
            type="tel"
            hasError={row.original.warnings.some((w: string) => w.toLowerCase().includes("phone"))}
          />
        ),
      },
      {
        id: "organizationId",
        accessorKey: "organizationId",
        size: 160,
        header: "Organization",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <Select
            value={row.original.organizationId}
            onChange={(e) =>
              updateRow(row.original.id, { organizationId: e.target.value })
            }
            className="h-8 border-transparent bg-transparent text-sm shadow-none focus:border-input focus:bg-background"
          >
            <option value="">Select…</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        ),
      },
      {
        id: "projectId",
        accessorKey: "projectId",
        size: 160,
        header: "Project",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <Select
            value={row.original.projectId}
            onChange={(e) =>
              updateRow(row.original.id, { projectId: e.target.value })
            }
            className="h-8 border-transparent bg-transparent text-sm shadow-none focus:border-input focus:bg-background"
          >
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </Select>
        ),
      },
      {
        id: "department",
        accessorKey: "department",
        size: 120,
        header: "Department",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <EditableCell
            value={row.original.department}
            onChange={(v) => updateRow(row.original.id, { department: v })}
            placeholder="Dept"
          />
        ),
      },
      {
        id: "jobTitle",
        accessorKey: "jobTitle",
        size: 140,
        header: "Job title",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <EditableCell
            value={row.original.jobTitle}
            onChange={(v) => updateRow(row.original.id, { jobTitle: v })}
            placeholder="Job title"
            hasError={row.original.errors.some((e: string) => e.toLowerCase().includes("job"))}
          />
        ),
      },
      {
        id: "role",
        accessorKey: "role",
        size: 130,
        header: "Role",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <Select
            value={row.original.role}
            onChange={(e) =>
              updateRow(row.original.id, {
                role: e.target.value as InviteRow["role"],
              })
            }
            className="h-8 border-transparent bg-transparent text-sm shadow-none focus:border-input focus:bg-background"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        ),
      },
      {
        id: "projectRole",
        accessorKey: "projectRole",
        size: 120,
        header: "Project role",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <EditableCell
            value={row.original.projectRole}
            onChange={(v) => updateRow(row.original.id, { projectRole: v })}
            placeholder="Member"
          />
        ),
      },
      {
        id: "notes",
        accessorKey: "notes",
        size: 140,
        header: "Notes",
        cell: ({ row }: { row: { original: InviteRow } }) => (
          <EditableCell
            value={row.original.notes}
            onChange={(v) => updateRow(row.original.id, { notes: v })}
            placeholder="Notes"
          />
        ),
      },
      {
        id: "actions",
        size: 48,
        enableResizing: false,
        header: "",
        cell: (props: any) => (
          <RowActions
            rowId={props.row.original.id}
            controller={controller}
            index={props.row.index}
            total={props.table.getRowModel().rows.length}
          />
        ),
      },
    ],
    [
      controller,
      filteredRows,
      selectedIds,
      selectAll,
      clearSelection,
      toggleSelect,
      updateRow,
      roles,
      organizations,
      projects,
    ]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange" as ColumnResizeMode,
    getRowId: (row: InviteRow) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
      setSelected(new Set(Object.keys(next).filter((k) => next[k])));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  if (filteredRows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
        <p className="text-sm text-muted-foreground">
          No rows match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: "min(60vh, 560px)" }}
      >
        <table className="w-full border-collapse text-sm" style={{ width: table.getCenterTotalSize() }}>
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
            {table.getHeaderGroups().map((hg: any) => (
              <tr key={hg.id} className="border-b">
                {hg.headers.map((header: any) => (
                  <th
                    key={header.id}
                    className="relative h-10 px-2 text-left text-xs font-semibold text-muted-foreground select-none"
                    style={{ width: header.getSize() }}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        header.column.getCanSort() && "cursor-pointer hover:text-foreground"
                      )}
                      onClick={header.column.getToggleSortingHandler}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ChevronUp className="h-3 w-3" />,
                        desc: <ChevronDown className="h-3 w-3" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler}
                        onTouchStart={header.getResizeHandler}
                        className={cn(
                          "absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-primary/40",
                          header.column.getIsResizing() && "bg-primary"
                        )}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              height: `${totalSize}px`,
              position: "relative",
            }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className={cn(
                    "absolute left-0 w-full border-b border-border/50 hover:bg-muted/40 transition-colors",
                    selectedIds.has(row.original.id) && "bg-primary/5"
                  )}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  {row.getVisibleCells().map((cell: any) => (
                    <td
                      key={cell.id}
                      className="px-1 py-1 align-middle"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          {filteredRows.length} row{filteredRows.length !== 1 ? "s" : ""}
          {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
        </span>
        <span className="hidden sm:inline">
          Ctrl+Z undo · Ctrl+Shift+Z redo
        </span>
      </div>
    </div>
  );
}