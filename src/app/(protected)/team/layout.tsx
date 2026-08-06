import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { SignOutButton } from "@/components/sign-out-button";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-700 text-xs font-bold text-white">
                O
              </span>
              <span className="text-sm font-semibold text-slate-900">Ovid PMS</span>
            </Link>
            <span className="text-slate-300" aria-hidden>
              /
            </span>
            <span className="text-sm font-medium text-slate-700">Team</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-emerald-700">
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-5 md:p-6">{children}</main>
    </div>
  );
}
