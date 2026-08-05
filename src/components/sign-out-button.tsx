"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

type SignOutButtonProps = {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
};

export function SignOutButton({
  className = "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors",
  iconClassName = "h-4 w-4 shrink-0",
  labelClassName = "",
}: SignOutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
      aria-label="Sign out"
    >
      <LogOut className={iconClassName} aria-hidden />
      <span className={labelClassName}>Sign out</span>
    </button>
  );
}
