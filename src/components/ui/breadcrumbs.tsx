import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
};

type BreadcrumbsProps = {
  items: Crumb[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className={cn("flex items-center gap-1.5 text-xs text-fg-muted", className)} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const content = (
          <span className="inline-flex items-center gap-1">
            {item.icon ?? null}
            <span>{item.label}</span>
          </span>
        );

        return (
          <span key={i} className="flex items-center gap-1.5">
            {i === 0 && !item.icon && <Home className="h-3 w-3 text-fg-subtle" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-fg-default transition-colors font-medium">
                {content}
              </Link>
            ) : (
              <span className={cn(isLast ? "text-fg-default font-semibold" : "text-fg-subtle")}>
                {content}
              </span>
            )}
            {!isLast && <ChevronRight className="h-3 w-3 text-fg-subtle" />}
          </span>
        );
      })}
    </nav>
  );
}