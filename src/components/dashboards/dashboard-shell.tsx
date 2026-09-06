"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardHat,
  LayoutDashboard,
  FolderKanban,
  Bell,
  Menu,
  Moon,
  Sun,
  ChevronDown,
  Search,
  LogOut,
  Users,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {ROLE_LABELS } from "@/lib/constants";
import { titleCase } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: FolderKanban },
  { href: "/projects", label: "Projects", icon: HardHat },
];

type DashboardShellProps = {
  children: React.ReactNode;
  session: {
    name: string;
    role: string;
    organizationName: string;
    partyType: string;
    companyRoles?: string[];
  };
};

export function DashboardShell({ children, session }: DashboardShellProps) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("ovid-dark-mode");
    if (stored === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ovid-dark-mode", String(next));
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const roleLabel = ROLE_LABELS[session.role as keyof typeof ROLE_LABELS] ?? session.role;

  const companyRoles = new Set(session.companyRoles ?? []);
  const companyNav = [
    { href: "/dashboard", label: "Company", icon: LayoutDashboard, show: true },
    { href: "/company/tenders", label: "Tendering", icon: FolderKanban, show: ["HEAD_TENDERING", "TENDERING_OFFICER", "LEGAL_SERVICE_MANAGER", "ENGINEERING_DEPT_MANAGER"].some((r) => companyRoles.has(r)) },
    { href: "/company/approvals", label: "Approvals", icon: LayoutDashboard, show: true },
    { href: "/company/assets", label: "Standards & Fleet", icon: HardHat, show: ["ENGINEERING_DEPT_MANAGER", "HEAD_ENGINEERING_SERVICES", "ENGINEERING_SERVICES_OFFICER", "EQUIPMENT_ADMIN_MANAGER", "GENERAL_MANAGER"].some((r) => companyRoles.has(r)) },
    { href: "/company/audit", label: "Audit & Compliance", icon: Search, show: companyRoles.has("INTERNAL_AUDITOR") || companyRoles.has("GENERAL_MANAGER") },
    { href: "/company/interventions", label: "Executive Actions", icon: ListChecks, show: [...companyRoles].some((r) => ["GENERAL_MANAGER", "LEGAL_SERVICE_MANAGER", "HEAD_TENDERING", "HEAD_PLANNING_MONITORING", "PLANNING_OFFICER", "ENGINEERING_DEPT_MANAGER", "HEAD_ENGINEERING_SERVICES", "EQUIPMENT_ADMIN_MANAGER", "FINANCE_DEPT_MANAGER"].includes(r)) },
    { href: "/dashboard?workspace=project", label: "Project Dashboard", icon: HardHat, show: true },
  ].filter((item) => item.show).map(({ show: _show, ...item }) => item);
  const navItems = session.role === "ADMIN"
    ? [...NAV_ITEMS, { href: "/company/staff", label: "Company Staff", icon: Users }]
    : session.companyRoles?.length ? [...companyNav, ...NAV_ITEMS.slice(1)] : NAV_ITEMS;
  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#fdfcf9]">


      <Separator className="bg-[#efe8de]" />

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a08f7a]" />
          <input
            placeholder="Search..."
            className="h-9 w-full rounded-md border border-[#e0d5c5] bg-[#f5f0e8] pl-8 pr-3 text-xs text-[#2c2420] placeholder:text-[#a08f7a] focus:outline-none focus:ring-2 focus:ring-[#c04928] focus:ring-offset-1 focus:ring-offset-[#fdfcf9]"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-3 flex-1 space-y-0.5 px-3">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-[#a08f7a] font-sans">
          Main
        </p>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors font-sans",
                active
                  ? "bg-[#c04928]/10 text-[#c04928] font-semibold"
                  : "text-[#7a6b59] hover:bg-[#f5f0e8] hover:text-[#2c2420]"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-[#c04928]" : "text-[#a08f7a]"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#faf7f2]">
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden w-60 shrink-0 border-r border-[#efe8de] bg-[#fdfcf9] lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────────────── */}
      <Sheet>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent />
        </SheetContent>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-[#efe8de] bg-[#faf7f2]/95 backdrop-blur px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-[#7a6b59] hover:bg-[#efe8de]"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

            </div>

            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <Button variant="ghost" size="icon" className="relative text-[#7a6b59] hover:bg-[#efe8de]" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#c04928] ring-2 ring-[#faf7f2]" />
              </Button>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2.5 px-2 text-[#7a6b59] hover:bg-[#efe8de]"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-[#c04928] text-[10px] font-bold text-white">
                        {session.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left sm:block">
                      <p className="text-xs font-semibold text-[#2c2420] leading-tight">
                        {session.name}
                      </p>
                      <p className="text-[10px] text-[#7a6b59] leading-tight">
                        {session.organizationName}
                      </p>
                    </div>
                    <ChevronDown className="hidden h-3.5 w-3.5 text-[#a08f7a] sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-[#efe8de] bg-[#fdfcf9]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-[#2c2420]">{session.name}</p>
                      <p className="text-xs font-normal text-[#7a6b59]">{roleLabel}</p>
                      <p className="text-xs font-normal text-[#7a6b59]">{session.organizationName}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#efe8de]" />
                  <DropdownMenuItem asChild className="text-[#2c2420] hover:bg-[#f5f0e8]">
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-[#2c2420] hover:bg-[#f5f0e8]">
                    <Link href="/portfolio">Portfolio</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-[#2c2420] hover:bg-[#f5f0e8]">
                    <Link href="/projects">All Projects</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#efe8de]" />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      fetch("/api/auth/logout", { method: "POST" }).then(() => {
                        window.location.href = "/login";
                      });
                    }}
                    className="text-[#c04928] gap-2 hover:bg-[#fdf1ee]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1">{children}</main>
        </div>
      </Sheet>
    </div>
  );
}
