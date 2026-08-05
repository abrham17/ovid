import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Accessible labeled field. Pass matching `id` on the control. */
export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
