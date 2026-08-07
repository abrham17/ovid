// components/bulk-invite/import-step.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  FileText,
  ClipboardPaste,
  Keyboard,
  Upload,
  Mail,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BulkInviteController } from "./hooks/useBulkInvite";
import type { ImportMethod } from "./types";

interface ImportStepProps {
  controller: BulkInviteController;
}

const METHODS: {
  id: ImportMethod;
  title: string;
  description: string;
  icon: React.ElementType;
  accept?: string;
}[] = [
  {
    id: "paste-emails",
    title: "Paste emails",
    description: "One email per line. Names are auto-derived.",
    icon: Mail,
  },
  {
    id: "paste-spreadsheet",
    title: "Paste spreadsheet",
    description: "Copy rows from Excel or Google Sheets.",
    icon: ClipboardPaste,
  },
  {
    id: "csv",
    title: "Upload CSV",
    description: "Import a .csv file with headers.",
    icon: FileText,
    accept: ".csv,text/csv",
  },
  {
    id: "excel",
    title: "Upload Excel",
    description: "Import .xlsx or .xls workbooks.",
    icon: FileSpreadsheet,
    accept: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
  },
  {
    id: "manual",
    title: "Manual entry",
    description: "Start with an empty spreadsheet and type.",
    icon: Keyboard,
  },
];

export function ImportStep({ controller }: ImportStepProps) {
  const [activeMethod, setActiveMethod] = useState<ImportMethod | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMethodSelect = (method: ImportMethod) => {
    setActiveMethod(method);
    if (method === "manual") {
      controller.addManualRow();
      controller.setStep("preview");
    }
  };

  const processPaste = async () => {
    if (!pasteText.trim() || !activeMethod) return;
    setIsProcessing(true);
    try {
      if (activeMethod === "paste-emails") {
        controller.importFromEmails(pasteText, {});
      } else {
        controller.importFromCsvText(pasteText, {});
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      try {
        const method: ImportMethod =
          file.name.endsWith(".csv") || file.type.includes("csv") ? "csv" : "excel";
        await controller.importFromFile(file, method, {});
      } finally {
        setIsProcessing(false);
      }
    },
    [controller]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Import users
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want to add people to this invitation batch.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METHODS.map((method) => {
          const Icon = method.icon;
          const isActive = activeMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => handleMethodSelect(method.id)}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left transition-all",
                "hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive && "border-primary bg-primary/5 shadow-sm"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border bg-background transition-colors",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{method.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {method.description}
                </div>
              </div>
              {isActive && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {(activeMethod === "paste-emails" || activeMethod === "paste-spreadsheet") && (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border bg-card p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="paste-area" className="text-sm font-medium">
                {activeMethod === "paste-emails"
                  ? "Email addresses"
                  : "Spreadsheet data"}
              </Label>
              <Textarea
                id="paste-area"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={
                  activeMethod === "paste-emails"
                    ? "foreman1@company.com\nforeman2@company.com\nsite.engineer@company.com"
                    : "Full Name, Email, Job Title, Role\nAbebe Kebede, abebe@company.com, Site Foreman, FOREMAN"
                }
                className="min-h-[140px] resize-y font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {activeMethod === "paste-emails"
                  ? "One email per line. Full names will be suggested automatically."
                  : "Include a header row. Supported columns: Full Name, Email, Phone, Job Title, Role, Department."}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveMethod(null);
                  setPasteText("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!pasteText.trim() || isProcessing}
                onClick={processPaste}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {(activeMethod === "csv" || activeMethod === "excel") && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border bg-card p-5"
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/40"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-foreground">Importing…</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Drag & drop your file here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse · max 500 rows
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose file
                  </Button>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={
                activeMethod === "csv"
                  ? ".csv,text/csv"
                  : ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              }
              onChange={onFileChange}
            />
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveMethod(null)}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always-available drop zone hint */}
      {!activeMethod && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-xl border border-dashed px-6 py-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20"
          )}
        >
          <p className="text-sm text-muted-foreground">
            You can also drag a CSV or Excel file anywhere on this page.
          </p>
        </div>
      )}
    </div>
  );
}