"use client";

import { useState } from "react";
import {
  FolderKanban,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Search,
  Layers,
  Edit2,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import type { WbsWorkspaceData, WbsTreeNode } from "@/lib/services/wbs.service";
import type { WBSNodeType } from "@/generated/prisma/enums";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { createWbsNode, updateWbsNode, archiveWbsNode, toggleDesignReady } from "@/lib/actions/wbs";

const NODE_TYPE_LABELS: Record<WBSNodeType, string> = {
  PHASE: "Phase",
  SECTION: "Section",
  FLOOR: "Floor",
  STATION_RANGE: "Station Range",
  STRUCTURAL_ELEMENT: "Structural Element",
  ACTIVITY: "Activity",
};

const NODE_TYPE_BADGES: Record<WBSNodeType, string> = {
  PHASE: "bg-purple-50 text-purple-700 border-purple-200",
  SECTION: "bg-indigo-50 text-indigo-700 border-indigo-200",
  FLOOR: "bg-blue-50 text-blue-700 border-blue-200",
  STATION_RANGE: "bg-amber-50 text-amber-700 border-amber-200",
  STRUCTURAL_ELEMENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVITY: "bg-slate-50 text-slate-700 border-slate-200",
};

export function WbsView({ data }: { data: WbsWorkspaceData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => {
    // Expand root nodes by default
    const set = new Set<string>();
    data.nodes.forEach((n) => set.add(n.id));
    return set;
  });

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  const [editingNode, setEditingNode] = useState<WbsTreeNode | null>(null);
  const [archivingNode, setArchivingNode] = useState<WbsTreeNode | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const set = new Set<string>();
    const collectIds = (nodes: WbsTreeNode[]) => {
      nodes.forEach((n) => {
        set.add(n.id);
        if (n.children.length > 0) collectIds(n.children);
      });
    };
    collectIds(data.nodes);
    setExpandedNodeIds(set);
  };

  const collapseAll = () => setExpandedNodeIds(new Set());

  const openCreateModal = (parentId?: string) => {
    setSelectedParentId(parentId);
    setCreateModalOpen(true);
  };

  const openEditModal = (node: WbsTreeNode) => {
    setEditingNode(node);
    setEditModalOpen(true);
  };

  const openArchiveModal = (node: WbsTreeNode) => {
    setArchivingNode(node);
    setArchiveModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Header Stats ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{data.stats.totalNodes}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total WBS Nodes</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-700">{data.stats.phaseCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Phases</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-indigo-700">{data.stats.sectionCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Sections</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-700">{data.stats.activityNodeCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Activity Nodes</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-700">{data.stats.designReadyPercent}%</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Design Ready ({data.stats.designReadyCount}/{data.stats.totalNodes})
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar & Filters ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Node Types</option>
                {Object.entries(NODE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-8">
                  Expand All
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-8">
                  Collapse All
                </Button>
              </div>
            </div>

            {data.canEditWbs && (
              <Button
                onClick={() => openCreateModal()}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                New Root Node
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Hierarchical Tree Table ───────────────────────────────────── */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-[40%]">WBS Node & Name</th>
                  <th className="py-3 px-3">Node Type</th>
                  <th className="py-3 px-3">Design Ready</th>
                  <th className="py-3 px-3 text-center">Activities</th>
                  <th className="py-3 px-3 text-center">BoQ Items</th>
                  {data.canEditWbs && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.nodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No WBS nodes found. Click &quot;New Root Node&quot; to create the initial structure.
                    </td>
                  </tr>
                ) : (
                  data.nodes.map((node) => (
                    <TreeRow
                      key={node.id}
                      node={node}
                      expandedIds={expandedNodeIds}
                      onToggle={toggleExpand}
                      searchTerm={searchTerm.toLowerCase()}
                      selectedType={selectedType}
                      canEdit={data.canEditWbs}
                      projectId={data.projectId}
                      onAddChild={(id) => openCreateModal(id)}
                      onEdit={(n) => openEditModal(n)}
                      onArchive={(n) => openArchiveModal(n)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal: Create Node ────────────────────────────────────────── */}
      <ModalDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedParentId ? "Add Child WBS Node" : "Create Root WBS Node"}
        description="Add a new node to the Work Breakdown Structure."
      >
        <ActionForm
          action={createWbsNode}
          onSuccess={() => setCreateModalOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="projectId" value={data.projectId} />
          {selectedParentId && <input type="hidden" name="parentId" value={selectedParentId} />}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parent Node
            </label>
            <select
              name="parentIdSelect"
              value={selectedParentId ?? ""}
              onChange={(e) => setSelectedParentId(e.target.value || undefined)}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">None (Top-Level Root Node)</option>
              {data.flatNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.code} — {n.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WBS Code *
              </label>
              <input
                type="text"
                name="code"
                required
                placeholder="e.g. 1.1 or CW-01"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Node Type *
              </label>
              <select
                name="nodeType"
                required
                defaultValue="SECTION"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                {Object.entries(NODE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Node Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Earthwork & Substructure"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Create WBS Node
            </SubmitButton>
          </div>
        </ActionForm>
      </ModalDialog>

      {/* ── Modal: Edit Node ──────────────────────────────────────────── */}
      {editingNode && (
        <ModalDialog
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit WBS Node — ${editingNode.code}`}
          description="Update node parameters or parent hierarchy."
        >
          <ActionForm
            action={updateWbsNode}
            onSuccess={() => setEditModalOpen(false)}
            className="space-y-4"
          >
            <input type="hidden" name="projectId" value={data.projectId} />
            <input type="hidden" name="nodeId" value={editingNode.id} />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parent Node
              </label>
              <select
                name="parentId"
                defaultValue={editingNode.parentId ?? ""}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">None (Top-Level Root Node)</option>
                {data.flatNodes
                  .filter((n) => n.id !== editingNode.id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.code} — {n.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WBS Code *
                </label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingNode.code}
                  required
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Node Type *
                </label>
                <select
                  name="nodeType"
                  defaultValue={editingNode.nodeType}
                  required
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  {Object.entries(NODE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Node Name *
              </label>
              <input
                type="text"
                name="name"
                defaultValue={editingNode.name}
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Changes
              </SubmitButton>
            </div>
          </ActionForm>
        </ModalDialog>
      )}

      {/* ── Modal: Archive / Delete Confirmation ──────────────────────── */}
      {archivingNode && (
        <ModalDialog
          isOpen={archiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          title="Delete WBS Node"
          description={`Are you sure you want to remove node ${archivingNode.code} — ${archivingNode.name}?`}
        >
          <div className="space-y-4">
            {archivingNode.children.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  This node has {archivingNode.children.length} child node(s). Re-parent or delete
                  child nodes before removing this node.
                </span>
              </div>
            )}

            <ActionForm
              action={archiveWbsNode}
              onSuccess={() => setArchiveModalOpen(false)}
              className="space-y-4"
            >
              <input type="hidden" name="projectId" value={data.projectId} />
              <input type="hidden" name="nodeId" value={archivingNode.id} />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setArchiveModalOpen(false)}
                >
                  Cancel
                </Button>
                <SubmitButton
                  size="sm"
                  variant="destructive"
                  disabled={archivingNode.children.length > 0}
                >
                  Delete Node
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}

/* ─── Recursive Tree Row Component ─────────────────────────────────────── */
function TreeRow({
  node,
  expandedIds,
  onToggle,
  searchTerm,
  selectedType,
  canEdit,
  projectId,
  onAddChild,
  onEdit,
  onArchive,
}: {
  node: WbsTreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  searchTerm: string;
  selectedType: string;
  canEdit: boolean;
  projectId: string;
  onAddChild: (id: string) => void;
  onEdit: (node: WbsTreeNode) => void;
  onArchive: (node: WbsTreeNode) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  // Filter checks
  const matchesSearch =
    !searchTerm ||
    node.code.toLowerCase().includes(searchTerm) ||
    node.name.toLowerCase().includes(searchTerm);
  const matchesType = selectedType === "ALL" || node.nodeType === selectedType;

  const showSelf = matchesSearch && matchesType;

  return (
    <>
      {showSelf && (
        <tr className="hover:bg-slate-50/80 transition-colors">
          {/* Node Code & Name with indentation */}
          <td className="py-2.5 px-4">
            <div
              className="flex items-center gap-1.5"
              style={{ paddingLeft: `${node.depth * 20}px` }}
            >
              {hasChildren ? (
                <button
                  onClick={() => onToggle(node.id)}
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="w-5" />
              )}

              <Badge variant="outline" className="font-mono text-[10px] font-bold">
                {node.code}
              </Badge>
              <span className="font-semibold text-slate-900 text-xs truncate max-w-xs" title={node.name}>
                {node.name}
              </span>
            </div>
          </td>

          {/* Node Type */}
          <td className="py-2.5 px-3 whitespace-nowrap">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                NODE_TYPE_BADGES[node.nodeType]
              }`}
            >
              {NODE_TYPE_LABELS[node.nodeType]}
            </span>
          </td>

          {/* Design Ready */}
          <td className="py-2.5 px-3 whitespace-nowrap">
            {canEdit ? (
              <ActionForm action={toggleDesignReady} className="inline-block">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="nodeId" value={node.id} />
                <input type="hidden" name="designReady" value={String(node.designReady)} />
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    node.designReady
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  title="Click to toggle design status"
                >
                  {node.designReady ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Ready
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-slate-400" />
                      Pending Design
                    </>
                  )}
                </button>
              </ActionForm>
            ) : (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                  node.designReady ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {node.designReady ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Ready
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-slate-400" /> Pending Design
                  </>
                )}
              </span>
            )}
          </td>

          {/* Activity Count */}
          <td className="py-2.5 px-3 text-center whitespace-nowrap">
            <span className="font-mono text-xs text-slate-700">{node.activityCount}</span>
          </td>

          {/* BoQ Count */}
          <td className="py-2.5 px-3 text-center whitespace-nowrap">
            <span className="font-mono text-xs text-slate-700">{node.boqItemCount}</span>
          </td>

          {/* Actions */}
          {canEdit && (
            <td className="py-2.5 px-4 text-right whitespace-nowrap">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onAddChild(node.id)}
                  title="Add Child Node"
                  className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onEdit(node)}
                  title="Edit Node"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onArchive(node)}
                  title="Delete Node"
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          )}
        </tr>
      )}

      {/* Render children if expanded */}
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            expandedIds={expandedIds}
            onToggle={onToggle}
            searchTerm={searchTerm}
            selectedType={selectedType}
            canEdit={canEdit}
            projectId={projectId}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onArchive={onArchive}
          />
        ))}
    </>
  );
}
