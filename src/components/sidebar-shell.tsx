"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

/* ─── Context ─────────────────────────────────────────────────────────── */
type SidebarCtx = {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  toggleMobile: () => void;
};

const SidebarContext = createContext<SidebarCtx>({
  collapsed: false,
  mobileOpen: false,
  toggle: () => {},
  toggleMobile: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

/* ─── Provider / Shell ───────────────────────────────────────────────── */
export function SidebarShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  function toggleMobile() {
    setMobileOpen((prev) => !prev);
  }

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, toggle, toggleMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

/* ─── Data attributes bridge for CSS ─────────────────────────────────── */
export function SidebarDataBridge() {
  const { collapsed, mobileOpen } = useSidebar();

  useEffect(() => {
    const sidebar = document.querySelector(".g-sidebar") as HTMLElement | null;
    if (!sidebar) return;
    sidebar.dataset.collapsed = String(collapsed);
    sidebar.dataset.mobileOpen = String(mobileOpen);
  }, [collapsed, mobileOpen]);

  return null;
}

/* ─── Mobile hamburger button (rendered in content area) ─────────────── */
export function MobileMenuButton() {
  const { mobileOpen, toggleMobile } = useSidebar();
  return (
    <button
      onClick={toggleMobile}
      aria-label={mobileOpen ? "Close menu" : "Open menu"}
      className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
    >
      {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

/* ─── Collapse toggle button (inside sidebar) ─────────────────────────── */
export function SidebarCollapseButton() {
  const { collapsed, toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="sidebar-button flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
        aria-hidden
      >
        <path
          d="M10 3L6 8l4 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* ─── Mobile backdrop ─────────────────────────────────────────────────── */
export function SidebarBackdrop() {
  const { mobileOpen, toggleMobile } = useSidebar();
  if (!mobileOpen) return null;
  return (
    <div
      className="g-sidebar-backdrop fixed inset-0 z-[39] bg-black/50 backdrop-blur-sm md:hidden"
      onClick={toggleMobile}
      aria-hidden
    />
  );
}
