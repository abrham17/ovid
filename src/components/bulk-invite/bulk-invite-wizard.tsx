// components/bulk-invite/bulk-invite-wizard.tsx
"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { BulkInviteFormProps, InviteRow, SendResult } from "./types";
import { useBulkInvite } from "./hooks/useBulkInvite";
import { ImportStep } from "./import-step";
import { PreviewStep } from "./preview-step";
import { ReviewStep } from "./review-step";
import { SendingDialog } from "./sending-dialog";
import { ResultsStep } from "./results-step";
import { ProgressTracker } from "./progress-tracker";

export function BulkInviteWizard(props: BulkInviteFormProps) {
  const controller = useBulkInvite(props);

  const handleSend = useCallback(async () => {
    const sendFn = async (rows: InviteRow[]): Promise<SendResult[]> => {
      try {
        const payload = rows.map(
          ({
            fullName,
            email,
            phone,
            projectId,
            jobTitle,
            role,
            projectRole,
          }) => ({
            fullName,
            email,
            phone: phone || undefined,
            projectId: projectId || undefined,
            jobTitle,
            role,
            projectRole: projectRole || undefined,
          })
        );

        const response = await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitations: payload,
            projectId: rows[0]?.projectId || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to send invitations");
        }

        if (Array.isArray(result)) {
          return result.map(
            (r: {
              email: string;
              status: string;
              message?: string;
            }) => ({
              email: r.email,
              fullName: "",
              success: r.status === "created" || r.status === "added_to_project",
              code: r.status === "created" ? "sent" : (r.status === "added_to_project" || r.status === "already_member" ? "already_registered" : r.status === "pending" ? "already_invited" : "failed"),
              message: r.message ?? (r.status === "created" ? "Invitation created" : "Failed"),
            })
          );
        }

        return rows.map((row) => ({
          email: row.email,
          fullName: row.fullName,
          success: true,
          code: "sent" as const,
          message: "Invitation created",
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error";
        toast.error(message);
        return rows.map((row) => ({
          email: row.email,
          fullName: row.fullName,
          success: false,
          code: "failed" as const,
          message,
        }));
      }
    };

    await controller.startSending(sendFn);
  }, [controller]);

  const stepKey =
    controller.step === "validation" || controller.step === "assignment"
      ? "preview"
      : controller.step === "sending"
        ? "review"
        : controller.step;

  return (
    <div className="w-full space-y-8">
      <ProgressTracker current={controller.step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {controller.step === "import" && (
            <ImportStep controller={controller} />
          )}
          {(controller.step === "preview" ||
            controller.step === "validation" ||
            controller.step === "assignment") && (
            <PreviewStep controller={controller} />
          )}
          {(controller.step === "review" || controller.step === "sending") && (
            <ReviewStep controller={controller} onConfirm={handleSend} />
          )}
          {controller.step === "results" && (
            <ResultsStep controller={controller} />
          )}
        </motion.div>
      </AnimatePresence>

      <SendingDialog controller={controller} />
    </div>
  );
}