// components/bulk-invite/hooks/useBulkInvite.ts
"use client";

import { useCallback, useMemo, useReducer, useRef } from "react";
import type { UserRole } from "@/generated/prisma/enums";
import type {
  BulkActionsPayload,
  BulkInviteFormProps,
  ImportMethod,
  InviteRow,
  SendResult,
  WizardStep,
} from "../types";
import { applyValidation } from "../lib/validation";
import { mergeDuplicateRows } from "../lib/duplicate";
import { createEmptyInviteRow, computeSummary } from "../lib/utils";
import { parseCsvFile, parseCsvText } from "../lib/import-csv";
import { parseExcelFile } from "../lib/import-excel";
import { deriveNameFromEmail, normalizePhone } from "../lib/validation";

interface State {
  step: WizardStep;
  rows: InviteRow[];
  selectedIds: Set<string>;
  globalFilter: string;
  statusFilter: "all" | "ready" | "warning" | "error" | "duplicate";
  results: SendResult[] | null;
  isSending: boolean;
  sendProgress: { current: number; total: number; currentEmail: string };
  history: InviteRow[][];
  historyIndex: number;
  importErrors: string[];
}

type Action =
  | { type: "SET_STEP"; step: WizardStep }
  | { type: "SET_ROWS"; rows: InviteRow[]; pushHistory?: boolean }
  | { type: "UPDATE_ROW"; id: string; patch: Partial<InviteRow> }
  | { type: "ADD_ROWS"; rows: InviteRow[] }
  | { type: "REMOVE_ROWS"; ids: string[] }
  | { type: "SET_SELECTED"; ids: Set<string> }
  | { type: "TOGGLE_SELECT"; id: string }
  | { type: "SELECT_ALL"; ids: string[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_GLOBAL_FILTER"; value: string }
  | { type: "SET_STATUS_FILTER"; value: State["statusFilter"] }
  | { type: "APPLY_BULK"; payload: BulkActionsPayload; target: "selected" | "filtered" | "all" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_RESULTS"; results: SendResult[] }
  | { type: "SET_SENDING"; isSending: boolean; progress?: State["sendProgress"] }
  | { type: "SET_IMPORT_ERRORS"; errors: string[] }
  | { type: "RESET" };

const MAX_HISTORY = 50;
const MAX_ROWS = 500;

function pushHistory(state: State, nextRows: InviteRow[]): State {
  const truncated = state.history.slice(0, state.historyIndex + 1);
  truncated.push(nextRows);
  if (truncated.length > MAX_HISTORY) truncated.shift();
  return {
    ...state,
    rows: nextRows,
    history: truncated,
    historyIndex: truncated.length - 1,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_ROWS": {
      if (action.pushHistory) return pushHistory(state, action.rows);
      return { ...state, rows: action.rows };
    }
    case "UPDATE_ROW": {
      const next = state.rows.map((r) =>
        r.id === action.id ? { ...r, ...action.patch } : r
      );
      return pushHistory(state, next);
    }
    case "ADD_ROWS": {
      const combined = [...state.rows, ...action.rows].slice(0, MAX_ROWS);
      return pushHistory(state, combined);
    }
    case "REMOVE_ROWS": {
      const idSet = new Set(action.ids);
      const next = state.rows.filter((r) => !idSet.has(r.id));
      const selected = new Set([...state.selectedIds].filter((id) => !idSet.has(id)));
      return { ...pushHistory(state, next), selectedIds: selected };
    }
    case "SET_SELECTED":
      return { ...state, selectedIds: action.ids };
    case "TOGGLE_SELECT": {
      const next = new Set(state.selectedIds);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, selectedIds: next };
    }
    case "SELECT_ALL":
      return { ...state, selectedIds: new Set(action.ids) };
    case "CLEAR_SELECTION":
      return { ...state, selectedIds: new Set() };
    case "SET_GLOBAL_FILTER":
      return { ...state, globalFilter: action.value };
    case "SET_STATUS_FILTER":
      return { ...state, statusFilter: action.value };
    case "APPLY_BULK": {
      const targetIds =
        action.target === "all"
          ? new Set(state.rows.map((r) => r.id))
          : action.target === "selected"
            ? state.selectedIds
            : new Set(
                state.rows
                  .filter((r) => {
                    if (state.statusFilter !== "all" && r.status !== state.statusFilter) return false;
                    if (!state.globalFilter) return true;
                    const q = state.globalFilter.toLowerCase();
                    return (
                      r.fullName.toLowerCase().includes(q) ||
                      r.email.toLowerCase().includes(q) ||
                      r.jobTitle.toLowerCase().includes(q)
                    );
                  })
                  .map((r) => r.id)
              );

      const next = state.rows.map((row) => {
        if (!targetIds.has(row.id)) return row;
        const patch: Partial<InviteRow> = {};
        if (action.payload.role) patch.role = action.payload.role;
        if (action.payload.projectId !== undefined) patch.projectId = action.payload.projectId;
        if (action.payload.organizationId) patch.organizationId = action.payload.organizationId;
        if (action.payload.department !== undefined) patch.department = action.payload.department;
        if (action.payload.jobTitle !== undefined) patch.jobTitle = action.payload.jobTitle;
        if (action.payload.projectRole !== undefined) patch.projectRole = action.payload.projectRole;
        if (action.payload.phonePrefix && row.phone) {
          const digits = row.phone.replace(/\D/g, "");
          patch.phone = `${action.payload.phonePrefix}${digits}`;
        }
        return { ...row, ...patch };
      });
      return pushHistory(state, next);
    }
    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return { ...state, rows: state.history[idx], historyIndex: idx };
    }
    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return { ...state, rows: state.history[idx], historyIndex: idx };
    }
    case "SET_RESULTS":
      return { ...state, results: action.results, isSending: false, step: "results" };
    case "SET_SENDING":
      return {
        ...state,
        isSending: action.isSending,
        sendProgress: action.progress ?? state.sendProgress,
        step: action.isSending ? "sending" : state.step,
      };
    case "SET_IMPORT_ERRORS":
      return { ...state, importErrors: action.errors };
    case "RESET":
      return {
        step: "import",
        rows: [],
        selectedIds: new Set(),
        globalFilter: "",
        statusFilter: "all",
        results: null,
        isSending: false,
        sendProgress: { current: 0, total: 0, currentEmail: "" },
        history: [[]],
        historyIndex: 0,
        importErrors: [],
      };
    default:
      return state;
  }
}

const initialState: State = {
  step: "import",
  rows: [],
  selectedIds: new Set(),
  globalFilter: "",
  statusFilter: "all",
  results: null,
  isSending: false,
  sendProgress: { current: 0, total: 0, currentEmail: "" },
  history: [[]],
  historyIndex: 0,
  importErrors: [],
};

export function useBulkInvite({
  roles,
  organizations,
  projects,
  defaultOrganizationId,
}: BulkInviteFormProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef(false);

  const validatedRows = useMemo(
    () => applyValidation(state.rows, organizations, projects, roles),
    [state.rows, organizations, projects, roles]
  );

  const summary = useMemo(() => computeSummary(validatedRows), [validatedRows]);

  const filteredRows = useMemo(() => {
    return validatedRows.filter((r) => {
      if (state.statusFilter !== "all" && r.status !== state.statusFilter) return false;
      if (!state.globalFilter.trim()) return true;
      const q = state.globalFilter.toLowerCase();
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.jobTitle.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    });
  }, [validatedRows, state.statusFilter, state.globalFilter]);

  const readyRows = useMemo(
    () => validatedRows.filter((r) => r.status === "ready" || r.status === "warning"),
    [validatedRows]
  );

  const setStep = useCallback((step: WizardStep) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const importFromEmails = useCallback(
    (text: string, defaults: Partial<InviteRow>) => {
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const rows = lines.map((email) => {
        const row = createEmptyInviteRow({
          ...defaults,
          organizationId: defaults.organizationId || defaultOrganizationId,
          role: defaults.role || roles[0],
        });
        row.email = email;
        row.fullName = deriveNameFromEmail(email);
        return row;
      });
      dispatch({ type: "ADD_ROWS", rows });
      dispatch({ type: "SET_STEP", step: "preview" });
    },
    [defaultOrganizationId, roles]
  );

  const importFromCsvText = useCallback(
    (text: string, defaults: Partial<InviteRow>) => {
      const { rows, errors } = parseCsvText(text, {
        ...defaults,
        organizationId: defaults.organizationId || defaultOrganizationId,
        role: defaults.role || roles[0],
      });
      dispatch({ type: "SET_IMPORT_ERRORS", errors });
      dispatch({ type: "ADD_ROWS", rows });
      dispatch({ type: "SET_STEP", step: "preview" });
    },
    [defaultOrganizationId, roles]
  );

  const importFromFile = useCallback(
    async (file: File, method: ImportMethod, defaults: Partial<InviteRow>) => {
      const baseDefaults = {
        ...defaults,
        organizationId: defaults.organizationId || defaultOrganizationId,
        role: defaults.role || roles[0],
      };
      let result: { rows: InviteRow[]; errors: string[] };
      if (method === "csv" || file.name.endsWith(".csv")) {
        result = await parseCsvFile(file, baseDefaults);
      } else {
        result = await parseExcelFile(file, baseDefaults);
      }
      dispatch({ type: "SET_IMPORT_ERRORS", errors: result.errors });
      dispatch({ type: "ADD_ROWS", rows: result.rows });
      dispatch({ type: "SET_STEP", step: "preview" });
    },
    [defaultOrganizationId, roles]
  );

  const addManualRow = useCallback(() => {
    const row = createEmptyInviteRow({
      organizationId: defaultOrganizationId,
      role: roles[0],
    });
    dispatch({ type: "ADD_ROWS", rows: [row] });
  }, [defaultOrganizationId, roles]);

  const updateRow = useCallback((id: string, patch: Partial<InviteRow>) => {
    if (patch.email && !patch.fullName) {
      // auto-fill is handled in the caller if desired
    }
    if (patch.phone) {
      patch.phone = normalizePhone(patch.phone);
    }
    dispatch({ type: "UPDATE_ROW", id, patch });
  }, []);

  const removeRows = useCallback((ids: string[]) => {
    dispatch({ type: "REMOVE_ROWS", ids });
  }, []);

  const duplicateRows = useCallback(
    (ids: string[]) => {
      const toClone = state.rows.filter((r) => ids.includes(r.id));
      const clones = toClone.map((r) => ({
        ...r,
        id: crypto.randomUUID(),
        email: "",
        status: "ready" as const,
        errors: [],
        warnings: [],
      }));
      dispatch({ type: "ADD_ROWS", rows: clones });
    },
    [state.rows]
  );

  const mergeDuplicates = useCallback(() => {
    const merged = mergeDuplicateRows(state.rows);
    dispatch({ type: "SET_ROWS", rows: merged, pushHistory: true });
  }, [state.rows]);

  const applyBulk = useCallback(
    (payload: BulkActionsPayload, target: "selected" | "filtered" | "all") => {
      dispatch({ type: "APPLY_BULK", payload, target });
    },
    []
  );

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const startSending = useCallback(
    async (sendFn: (rows: InviteRow[]) => Promise<SendResult[]>) => {
      abortRef.current = false;
      const toSend = readyRows;
      dispatch({
        type: "SET_SENDING",
        isSending: true,
        progress: { current: 0, total: toSend.length, currentEmail: "" },
      });

      // Simulated progressive send for UX; real implementation would batch
      const results: SendResult[] = [];
      for (let i = 0; i < toSend.length; i++) {
        if (abortRef.current) {
          for (let j = i; j < toSend.length; j++) {
            results.push({
              email: toSend[j].email,
              fullName: toSend[j].fullName,
              success: false,
              code: "skipped",
              message: "Cancelled by user",
            });
          }
          break;
        }
        dispatch({
          type: "SET_SENDING",
          isSending: true,
          progress: {
            current: i + 1,
            total: toSend.length,
            currentEmail: toSend[i].email,
          },
        });
        // In production the server action processes the whole batch;
        // we still show progress for UX.
        await new Promise((r) => setTimeout(r, 80));
      }

      if (!abortRef.current) {
        const serverResults = await sendFn(toSend);
        dispatch({ type: "SET_RESULTS", results: serverResults });
      } else {
        dispatch({ type: "SET_RESULTS", results });
      }
    },
    [readyRows]
  );

  const cancelSending = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    step: state.step,
    setStep,
    rows: validatedRows,
    filteredRows,
    readyRows,
    selectedIds: state.selectedIds,
    setSelected: (ids: Set<string>) => dispatch({ type: "SET_SELECTED", ids }),
    toggleSelect: (id: string) => dispatch({ type: "TOGGLE_SELECT", id }),
    selectAll: (ids: string[]) => dispatch({ type: "SELECT_ALL", ids }),
    clearSelection: () => dispatch({ type: "CLEAR_SELECTION" }),
    globalFilter: state.globalFilter,
    setGlobalFilter: (v: string) => dispatch({ type: "SET_GLOBAL_FILTER", value: v }),
    statusFilter: state.statusFilter,
    setStatusFilter: (v: State["statusFilter"]) =>
      dispatch({ type: "SET_STATUS_FILTER", value: v }),
    summary,
    importErrors: state.importErrors,
    results: state.results,
    isSending: state.isSending,
    sendProgress: state.sendProgress,
    importFromEmails,
    importFromCsvText,
    importFromFile,
    addManualRow,
    updateRow,
    removeRows,
    duplicateRows,
    mergeDuplicates,
    applyBulk,
    undo,
    redo,
    canUndo,
    canRedo,
    startSending,
    cancelSending,
    reset,
    roles,
    organizations,
    projects,
    defaultOrganizationId,
  };
}

export type BulkInviteController = ReturnType<typeof useBulkInvite>;