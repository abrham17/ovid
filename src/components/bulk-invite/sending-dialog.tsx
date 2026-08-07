"use client";

import { motion } from "framer-motion";
import { Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BulkInviteController } from "./hooks/useBulkInvite";

interface ProgressProps {
  value: number;
  className?: string;
}

function Progress({ value, className }: ProgressProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className ?? ""}`.trim()}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-200"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

interface SendingDialogProps {
  controller: BulkInviteController;
}

export function SendingDialog({ controller }: SendingDialogProps) {
  const { isSending, sendProgress, cancelSending } = controller;
  const { current, total, currentEmail } = sendProgress;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Dialog open={isSending} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Sending invitations
          </DialogTitle>
          <DialogDescription>
            Please keep this window open until the process completes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {current} of {total}
              </span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>

          <motion.div
            key={currentEmail}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5"
          >
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {currentEmail || "Preparing…"}
              </p>
              <p className="text-xs text-muted-foreground">Sending now</p>
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="tabular-nums">{Math.max(0, current - 0)}</span>
              <span className="text-muted-foreground">sent</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <XCircle className="h-3.5 w-3.5" />
              <span className="tabular-nums">0</span>
              <span>failed</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelSending}
          >
            Cancel remaining
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}