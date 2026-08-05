import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium text-emerald-700">404</p>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you requested does not exist or you do not have access to it.
      </p>
      <Link href="/dashboard">
        <Button type="button">Back to dashboard</Button>
      </Link>
    </div>
  );
}
