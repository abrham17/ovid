import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  children,
  empty,
  className,
  headerAction,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  empty?: { title: string; description?: string } | null;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {headerAction}
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState title={empty.title} description={empty.description} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
