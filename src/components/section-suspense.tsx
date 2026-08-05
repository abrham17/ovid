import { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";

/** Lightweight section boundary for heavy server-rendered blocks. */
export function SectionSuspense({
  children,
  label = "Loading section…",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return <Suspense fallback={<PageLoader label={label} />}>{children}</Suspense>;
}
