// components/bulk-invite/row-actions.tsx
"use client";

import { MoreHorizontal, Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BulkInviteController } from "./hooks/useBulkInvite";

interface RowActionsProps {
  rowId: string;
  controller: BulkInviteController;
  index: number;
  total: number;
  onMove?: (from: number, to: number) => void;
}

export function RowActions({
  rowId,
  controller,
  index,
  total,
  onMove,
}: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only">Row actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          className="text-xs gap-2"
          onSelect={() => controller.duplicateRows([rowId])}
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </DropdownMenuItem>
        {onMove && (
          <>
            <DropdownMenuItem
              className="text-xs gap-2"
              disabled={index === 0}
              onSelect={() => onMove(index, index - 1)}
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2"
              disabled={index === total - 1}
              onSelect={() => onMove(index, index + 1)}
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Move down
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs gap-2 text-destructive focus:text-destructive"
          onSelect={() => controller.removeRows([rowId])}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}