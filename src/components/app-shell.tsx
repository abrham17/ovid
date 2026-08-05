import Link from "next/link";
import { LayoutDashboard, FolderKanban, Settings } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import {
  SidebarShell,
  SidebarDataBridge,
  SidebarCollapseButton,
  SidebarBackdrop,
  MobileMenuButton,
} from "@/components/sidebar-shell";

/* ─── Primary nav items ────────────────────────────────────────────────── */
const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
] as const;

/* ─── AppShell (Server Component) ─────────────────────────────────────── */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const initials = user.organizationName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <SidebarShell>
      <SidebarDataBridge />
      <SidebarBackdrop />

      {/* ── Global dark sidebar ─────────────────────────────────────── */}
      <aside className="g-sidebar" data-collapsed="false" data-mobile-open="false">
        {/* Logo row */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[--sidebar-border] px-4">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2.5 overflow-hidden"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[--sidebar-logo-bg] text-xs font-bold text-white">
              O
            </span>
            <span className="sidebar-label truncate text-sm font-semibold sidebar-fg-active">
              Ovid PMS
            </span>
          </Link>
          <SidebarCollapseButton />
        </div>

        {/* Primary nav */}
        <nav className="flex flex-col gap-0.5 px-2 pt-4" aria-label="Primary navigation">
          <p className="sidebar-label sidebar-fg-muted mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest">
            Navigation
          </p>
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              href={href}
              data-tooltip={label}
              className="sidebar-link group flex items-center gap-3 rounded-md px-2 py-2 text-[13px] font-medium"
              activeClassName="font-semibold"
            >
              <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
              <span className="sidebar-label truncate">{label}</span>
            </NavLink>
          ))}

          {/* Admin — role-gated */}
          {user.role === "ADMIN" && (
            <NavLink
              href="/admin"
              data-tooltip="Admin"
              className="sidebar-link group flex items-center gap-3 rounded-md px-2 py-2 text-[13px] font-medium"
              activeClassName="font-semibold"
            >
              <Settings className="h-4.5 w-4.5 shrink-0" aria-hidden />
              <span className="sidebar-label truncate">Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom user identity card */}
        <div className="border-t border-[--sidebar-border] p-3">
          <div className="sidebar-label mb-2 space-y-1.5 overflow-hidden rounded-md bg-[--sidebar-bg-hover] p-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="sidebar-fg-active truncate text-[13px] font-semibold">
                  {user.jobTitle ?? user.organizationName}
                </p>
                <p className="sidebar-fg-muted truncate text-[11px]">
                  {user.organizationName}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <PartyBadge partyType={user.partyType} className="text-[10px] px-2 py-0.5" />
              <RoleBadge role={user.role} className="text-[10px] px-2 py-0.5" />
            </div>
          </div>

          {/* Collapsed state: show only avatar */}
          <div className="flex items-center justify-center sidebar-avatar-only hidden">
            <span
              data-tooltip={user.jobTitle ?? user.organizationName}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white cursor-default"
            >
              {initials}
            </span>
          </div>

          <SignOutButton
            className="sidebar-button mt-2 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] hover:bg-red-900/30 hover:text-red-400"
            iconClassName="h-4 w-4 shrink-0"
            labelClassName="sidebar-label"
          />
        </div>
      </aside>

      {/* ── Content area ──────────────────────────────────────────────── */}
      <div className="g-sidebar-content">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:hidden">
          <MobileMenuButton />
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-700 text-xs font-bold text-white">
              O
            </span>
            <span className="text-sm font-semibold text-slate-900">Ovid PMS</span>
          </Link>
        </div>
        {/* Page content */}
        <main className="flex min-h-[calc(100vh-3rem)] flex-col md:min-h-screen">
          {children}
        </main>
      </div>

      {/* Sidebar label visibility driven by CSS (data-collapsed attr) */}
      <style>{`
        .g-sidebar[data-collapsed="true"] .sidebar-label { display: none; }
        .g-sidebar[data-collapsed="true"] .sidebar-avatar-only { display: flex !important; }
        .g-sidebar[data-collapsed="true"] .hidden.sidebar-avatar-only { display: flex !important; }
      `}</style>
    </SidebarShell>
  );
}
