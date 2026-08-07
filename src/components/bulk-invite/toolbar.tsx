// components/bulk-invite/toolbar.tsx
"use client";

import { useState } from "react";
import {
  Search,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Filter,
  X,
  Check,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BulkInviteController } from "./hooks/useBulkInvite";
import { BulkActions } from "./bulk-actions";

interface ToolbarProps {
  controller: BulkInviteController;
}

export function Toolbar({ controller }: ToolbarProps) {
  const {
    globalFilter,
    setGlobalFilter,
    statusFilter,
    setStatusFilter,
    selectedIds,
    filteredRows,
    removeRows,
    duplicateRows,
    undo,
    redo,
    canUndo,
    canRedo,
    clearSelection,
  } = controller;

  const selectedCount = selectedIds.size;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search name, email, title…"
            className="h-8 pl-8 text-sm"
          />
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              { value: "all", label: "All", icon: null },
              { value: "ready", label: "Ready", icon: Check },
              { value: "warning", label: "Warning", icon: AlertTriangle },
              { value: "error", label: "Error", icon: XCircle },
            ] as const
          ).map((chip) => {
            const Icon = chip.icon;
            const active = statusFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!canUndo}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!canRedo}
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        {selectedCount > 0 && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            <Badge variant="secondary" className="h-6 px-2 text-xs">
              {selectedCount} selected
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => duplicateRows([...selectedIds])}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                removeRows([...selectedIds]);
                clearSelection();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </>
        )}

        <BulkActions controller={controller} />
      </div>
    </div>
  );
}