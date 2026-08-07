"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon, Plus, FolderKanban, Users, Settings, FileText, Download, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderAction = {
  label: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "premium";
};

const iconMap: Record<string, LucideIcon> = {
  Plus,
  FolderKanban,
  Users,
  Settings,
  FileText,
  Download,
  ArrowLeft,
};

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: PageHeaderAction[];
  badge?: { label: string; variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "info" };
  dot?: boolean;
  className?: string;
};

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  dot,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-fg-muted">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {item.href ? (
                <Link href={item.href} className="hover:text-fg-default transition-colors font-medium">
                  {item.label}
                </Link>
              ) : (
                <span className="text-fg-subtle">{item.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 text-fg-subtle" />}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {dot && (
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot shrink-0" />
            )}
            <h1 className="text-2xl font-extrabold tracking-tight text-fg-default">{title}</h1>
            {badge && (
              <Badge variant={badge.variant ?? "default"} size="sm">
                {badge.label}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-fg-muted max-w-2xl">{description}</p>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            {actions.map((action, i) => {
              const Icon = action.icon ? iconMap[action.icon] : undefined;
              const btn = (
                <Button
                  key={i}
                  variant={action.variant === "premium" ? "premium" : (action.variant ?? "default")}
                  size="sm"
                  onClick={action.onClick}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {action.label}
                </Button>
              );

              if (action.href) {
                return (
                  <Link key={i} href={action.href}>
                    {btn}
                  </Link>
                );
              }
              return <span key={i}>{btn}</span>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}