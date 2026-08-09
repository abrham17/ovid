import { EmptyState } from "@/components/empty-state";
import { Network, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type ScopeBannerProps = {
  message: string | null | undefined;
  className?: string;
};

/** Compact notice shown above scoped module content. */
export function ScopeBanner({ message, className }: ScopeBannerProps) {
  if (!message) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-[#E8DFD2] bg-[#FAF7F2] px-4 py-3 text-xs text-stone-700",
        className
      )}
    >
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

type ScopeEmptyProps = {
  title?: string | null;
  description?: string | null;
  /** When true, render empty state even if title is null (generic fallback). */
  show?: boolean;
};

/** Full empty state when assignment / org scope has no visible data. */
export function ScopeEmptyState({ title, description, show }: ScopeEmptyProps) {
  if (!show && !title) return null;
  return (
    <EmptyState
      icon={Network}
      title={title ?? "Nothing in your scope"}
      description={
        description ??
        "Your role or organization does not currently have visible data in this module."
      }
    />
  );
}
