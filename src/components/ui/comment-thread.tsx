"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────

export type CommentUser = {
  id: string;
  name: string | null;
  role: string;
};

export type CommentData = {
  id: string;
  body: string;
  isDecision: boolean;
  decisionLabel: string | null;
  createdAt: string | Date;
  user: CommentUser;
  replies?: CommentData[];
};

export type CommentThreadProps = {
  comments: CommentData[];
  entityType: string;
  entityId: string;
  projectId: string;
  onSubmit: (body: string, parentId?: string) => Promise<void>;
  showHeader?: boolean;
  className?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SENIOR_PM: "Sr. PM",
    DEPUTY_PM: "Dep. PM",
    SITE_ENGINEER: "Site Eng.",
    FOREMAN: "Foreman",
    SUPERINTENDENT: "Superintendent",
    QC_INSPECTOR: "QC",
    HSE_OFFICER: "HSE",
    SUBCONTRACTOR_PM: "Sub. PM",
  };
  return labels[role] ?? role;
}

function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

// ── Single Comment ───────────────────────────────────────────────────

function CommentCard({
  comment,
  onReply,
  depth = 0,
}: {
  comment: CommentData;
  onReply?: (parentId: string) => void;
  depth?: number;
}) {
  return (
    <div
      className={cn(
        "group flex gap-3",
        depth > 0 && "ml-8 border-l-2 border-border-default pl-4"
      )}
    >
      <Avatar className="mt-0.5 h-7 w-7">
        <AvatarFallback className="text-[10px]">
          {getInitials(comment.user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-fg-default">
            {comment.user.name ?? "Unknown"}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {getRoleLabel(comment.user.role)}
          </Badge>
          {comment.isDecision && comment.decisionLabel && (
            <Badge
              className={cn(
                "text-[10px] px-1.5 py-0",
                comment.decisionLabel === "APPROVED" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
                comment.decisionLabel === "REJECTED" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                comment.decisionLabel === "CHANGES_REQUESTED" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
              )}
            >
              {comment.decisionLabel.replace("_", " ")}
            </Badge>
          )}
        </div>
        <div className="mt-1 text-sm text-fg-default whitespace-pre-wrap">
          {comment.body}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-fg-muted">
          <span>{timeAgo(comment.createdAt)}</span>
          {onReply && depth === 0 && (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="hover:text-fg-default transition-colors"
            >
              Reply
            </button>
          )}
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentCard key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comment Form ─────────────────────────────────────────────────────

function CommentForm({
  onSubmit,
  placeholder = "Write a comment…",
  submitLabel = "Comment",
  isReply = false,
  onCancel,
}: {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  isReply?: boolean;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-2", isReply && "ml-8")}>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className="min-h-[60px] text-sm"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!body.trim() || submitting}
        >
          {submitting ? "Posting…" : submitLabel}
        </Button>
        {isReply && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function CommentThread({
  comments,
  entityType,
  entityId,
  projectId,
  onSubmit,
  showHeader = true,
  className,
}: CommentThreadProps) {
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const handleSubmit = async (body: string, parentId?: string) => {
    // The caller handles the API call; we just call onSubmit
    await onSubmit(body, parentId);
  };

  const handleNewComment = async (body: string) => {
    await handleSubmit(body);
  };

  const handleReply = async (body: string) => {
    if (replyToId) {
      await handleSubmit(body, replyToId);
      setReplyToId(null);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg-default">
            Comments & Review History
          </h3>
          <span className="text-xs text-fg-muted">
            {comments.length} comment{comments.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <Separator />

      {/* New comment form */}
      <CommentForm onSubmit={handleNewComment} />

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-fg-muted py-4 text-center">
          No comments yet. Start the conversation above.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                onReply={(id) => setReplyToId(id === replyToId ? null : id)}
              />
              {replyToId === comment.id && (
                <div className="mt-3">
                  <CommentForm
                    onSubmit={handleReply}
                    placeholder="Write a reply…"
                    submitLabel="Reply"
                    isReply
                    onCancel={() => setReplyToId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}