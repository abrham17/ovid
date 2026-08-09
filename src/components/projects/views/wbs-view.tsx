"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { titleCase } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronRight, ChevronDown, Loader2, Trash2, CalendarRange, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScopeBanner, ScopeEmptyState } from "@/components/projects/scope-notice";

function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type WbsTreeNode = {
  id: string;
  code: string;
  name: string;
  nodeType: string;
  designReady: boolean;
  parentId?: string | null;
  plannedStartDate?: string | Date | null;
  plannedEndDate?: string | Date | null;
  status?: string;
  /** From EffectiveScope — false means read-only for this user. */
  canWrite?: boolean;
  children: WbsTreeNode[];
};

type Props = {
  projectId: string;
  tree: WbsTreeNode[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /** Role may create root nodes only when writable scope is ALL. */
  canCreateRoot?: boolean;
  scopeBanner?: string | null;
  scopeEmptyTitle?: string | null;
  scopeEmptyDescription?: string | null;
};

const NODE_TYPES = [
  "PHASE",
  "SECTION",
  "FLOOR",
  "STATION_RANGE",
  "STRUCTURAL_ELEMENT",
  "ACTIVITY",
] as const;

export function WbsView({
  projectId,
  tree,
  canCreate,
  canUpdate,
  canDelete,
  canCreateRoot = canCreate,
  scopeBanner,
  scopeEmptyTitle,
  scopeEmptyDescription,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(tree.map((n) => n.id))
  );
  
  // Default selected node or fallback
  const firstNode = tree[0]?.children?.[0] || tree[0];
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(firstNode?.id || null);

  const [showForm, setShowForm] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [nodeType, setNodeType] = useState<(typeof NODE_TYPES)[number]>("SECTION");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parent: string | null = null) {
    setParentId(parent);
    setName("");
    setCode("");
    setNodeType(parent ? "SECTION" : "PHASE");
    setError(null);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/wbs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          data: { parentId, name, code, nodeType, designReady: false },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to create node");
        return;
      }
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDesignReady(nodeId: string, designReady: boolean) {
    setBusyId(nodeId);
    try {
      await fetch(`/api/projects/${projectId}/wbs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_design_ready",
          nodeId,
          designReady,
        }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(nodeId: string) {
    if (!confirm("Delete this WBS node? It must have no children.")) return;
    setBusyId(nodeId);
    try {
      const res = await fetch(`/api/projects/${projectId}/wbs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", nodeId }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Delete failed");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function findNode(nodes: WbsTreeNode[], id: string): WbsTreeNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNode(n.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const selectedNode = selectedNodeId ? findNode(tree, selectedNodeId) : null;

  function renderTreeRow(node: WbsTreeNode, depth: number) {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isOpen = expanded.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const nodeCreatable = node.canWrite !== false && canCreate;
    const nodeDeletable = node.canWrite !== false && canDelete;

    return (
      <div key={node.id} className="space-y-1">
        <div
          onClick={() => setSelectedNodeId(node.id)}
          className={cn(
            "group flex cursor-pointer items-center justify-between rounded-lg px-4 py-2.5 transition-colors duration-150",
            isSelected
              ? "bg-[#FAF2E9] text-stone-900 font-semibold"
              : "hover:bg-[#F7F2EB] text-stone-700",
            node.canWrite === false && "opacity-90"
          )}
          style={{ paddingLeft: `${depth * 28 + 16}px` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-stone-400 hover:text-stone-700"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <span className="font-sans text-sm font-semibold text-stone-600 w-8">{node.code}</span>
            <span className="truncate text-sm font-medium text-stone-800">{node.name}</span>
            {node.canWrite === false && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500"
                title="Read-only for your assignment"
              >
                <Lock className="h-2.5 w-2.5" />
                Read-only
              </span>
            )}
            {node.plannedStartDate && node.plannedEndDate && (
              <span className="hidden text-[11px] text-stone-500 md:inline whitespace-nowrap">
                {formatShortDate(node.plannedStartDate)} → {formatShortDate(node.plannedEndDate)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {node.designReady ? (
              <span className="rounded-full bg-[#E3F2E6] px-3 py-0.5 text-xs font-semibold text-[#2E7D32]">
                Approved
              </span>
            ) : (
              <span className="rounded-full bg-[#FDE8E2] px-3 py-0.5 text-xs font-semibold text-[#C04928]">
                Pending
              </span>
            )}

            <div className="hidden opacity-0 group-hover:opacity-100 sm:flex items-center gap-1">
              {nodeCreatable && (
                <button
                  type="button"
                  className="rounded p-1 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreate(node.id);
                  }}
                  title="Add child"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
              {nodeDeletable && !hasChildren && (
                <button
                  type="button"
                  className="rounded p-1 text-red-500 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(node.id);
                  }}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Render detail section embedded under selected node */}
        {isSelected && selectedNode && (
          <div className="my-4 ml-8 rounded-2xl border border-[#EFE8DE] bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#2C2420]">
                  Node Detail: {selectedNode.code} {selectedNode.name}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-[#EAE3D9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
                    {titleCase(selectedNode.nodeType)}
                  </span>
                  <span className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    selectedNode.designReady
                      ? "bg-[#E3F2E6] text-[#2E7D32]"
                      : "bg-[#FDE8E2] text-[#C04928]"
                  )}>
                    {selectedNode.designReady ? "DESIGN READY" : "DESIGN PENDING"}
                  </span>
                  {selectedNode.canWrite === false && (
                    <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      <Lock className="h-2.5 w-2.5" /> Read-only
                    </span>
                  )}
                </div>
                {selectedNode.plannedStartDate && selectedNode.plannedEndDate && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                    <CalendarRange className="h-3.5 w-3.5 text-stone-400" />
                    {formatShortDate(selectedNode.plannedStartDate)} → {formatShortDate(selectedNode.plannedEndDate)}
                    {selectedNode.status && (
                      <span className="rounded bg-[#EAE3D9] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                        {selectedNode.status}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons — only when this node is writable */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedNode.canWrite !== false && canUpdate && (
                  <button
                    type="button"
                    disabled={busyId === selectedNode.id}
                    onClick={() => toggleDesignReady(selectedNode.id, !selectedNode.designReady)}
                    className="flex items-center gap-1.5 rounded-lg bg-[#C04928] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#A33A1F] shadow-xs"
                  >
                    {busyId === selectedNode.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {selectedNode.designReady ? "Mark design pending" : "Mark design ready"}
                  </button>
                )}
                {selectedNode.canWrite !== false && canCreate && (
                  <button
                    type="button"
                    onClick={() => openCreate(selectedNode.id)}
                    className="rounded-lg border border-[#D8D0C5] bg-white px-4 py-2 text-xs font-medium text-stone-800 transition hover:bg-[#FAF7F2]"
                  >
                    Add child node
                  </button>
                )}
              </div>
            </div>

            {/* Content grid */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-[#F2ECE1] bg-[#FAF7F2] p-4 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#EFE8DE]">
                  <span className="text-stone-500">Parent</span>
                  <span className="font-semibold text-stone-800">
                    {selectedNode.parentId ? "Substructure" : "Project Root"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#EFE8DE]">
                  <span className="text-stone-500">Children</span>
                  <span className="font-semibold text-stone-800">{selectedNode.children?.length || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#EFE8DE]">
                  <span className="text-stone-500">Write access</span>
                  <span className="font-semibold text-stone-800">
                    {selectedNode.canWrite === false ? "Read-only" : "Editable"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-stone-500">Design ready</span>
                  <span className={cn("font-bold", selectedNode.designReady ? "text-[#2E7D32]" : "text-[#C04928]")}>
                    {selectedNode.designReady ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#F8E3DD] bg-[#FDF3F0] p-4">
                <h4 className="font-serif text-sm font-bold text-[#C04928]">Design gate</h4>
                <p className="mt-1 text-xs text-[#8A341C] leading-relaxed">
                  Activities under this node cannot start until design is marked ready by Site Engineer or Deputy PM.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasChildren && isOpen && node.children.map((c) => renderTreeRow(c, depth + 1))}
      </div>
    );
  }

  const isScopeEmpty = tree.length === 0 && Boolean(scopeEmptyTitle);

  return (
    <div className="space-y-8">
      <ScopeBanner message={scopeBanner} />

      {canCreateRoot && !showForm && (
        <Button
          size="sm"
          onClick={() => openCreate(null)}
          className="bg-[#C04928] hover:bg-[#A33A1F] text-white font-medium shadow-xs"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add root node
        </Button>
      )}

      {showForm && (
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-900 mb-4">
            {parentId ? "Add child WBS node" : "Add root WBS node"}
          </h3>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 1.2 or S1-B3-GF"
                required
                className="bg-white border-[#D8D0C5]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value as any)}
              >
                {NODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-stone-600">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Foundation & footings"
                required
                className="bg-white border-[#D8D0C5]"
              />
            </div>
            {error && <p className="sm:col-span-2 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 sm:col-span-2 pt-2">
              <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create node"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Main WBS Tree Card Container */}
      <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-3">
        {isScopeEmpty ? (
          <ScopeEmptyState
            show
            title={scopeEmptyTitle}
            description={scopeEmptyDescription}
          />
        ) : tree.length === 0 ? (
          <div className="py-12 text-center text-stone-500 font-serif">
            No WBS structure nodes created yet. Click &quot;Add root node&quot; to begin.
          </div>
        ) : (
          tree.map((node) => renderTreeRow(node, 0))
        )}
      </div>
    </div>
  );
}
