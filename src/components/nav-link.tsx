"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = React.ComponentPropsWithoutRef<typeof Link> & {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
};

export function NavLink({
  href,
  children,
  className,
  activeClassName,
  exact = false,
  ...rest
}: NavLinkProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
      {...rest}
    >
      {children}
    </Link>
  );
}
