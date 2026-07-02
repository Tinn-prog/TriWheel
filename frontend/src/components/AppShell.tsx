"use client";

import { TriWheelLogo } from "@/components/TriWheelLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { LogoutConfirmButton } from "./LogoutConfirmButton";

export type AppNavIcon =
  | "active"
  | "alerts"
  | "book"
  | "history"
  | "home"
  | "messages"
  | "profile"
  | "requests"
  | "vehicle";

export type AppNavItem = {
  href: string;
  icon?: AppNavIcon;
  isDefaultSection?: boolean;
  label: string;
  shortLabel?: string;
};

type AppShellProps = {
  children: ReactNode;
  dashboardLabel: string;
  navItems: AppNavItem[];
  onLogout: () => void;
  user: {
    email: string;
    name: string;
  };
};

function useLocationHash() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return hash;
}

function moduleRootPath(href: string) {
  const hashIndex = href.indexOf("#");
  return hashIndex >= 0 ? href.slice(0, hashIndex) : href;
}

function isExactModuleRoot(href: string) {
  return ["/admin", "/driver", "/passenger"].includes(moduleRootPath(href));
}

function isNavActive(pathname: string, hash: string, item: AppNavItem) {
  const hashIndex = item.href.indexOf("#");

  if (hashIndex >= 0) {
    const hrefPath = item.href.slice(0, hashIndex);
    const hrefHash = item.href.slice(hashIndex);

    if (pathname !== hrefPath) {
      return false;
    }

    if (hash) {
      return hash === hrefHash;
    }

    return Boolean(item.isDefaultSection);
  }

  if (isExactModuleRoot(item.href)) {
    return pathname === moduleRootPath(item.href);
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function userInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function NavIcon({
  className = "size-5",
  name,
}: {
  className?: string;
  name: AppNavIcon;
}) {
  const iconProps = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.75,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "book":
      return (
        <svg {...iconProps}>
          <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      );
    case "active":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" fill="currentColor" r="2.5" stroke="none" />
        </svg>
      );
    case "alerts":
      return (
        <svg {...iconProps}>
          <path d="M15 17H9l-1 2h8l-1-2Z" />
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
        </svg>
      );
    case "history":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
    case "messages":
      return (
        <svg {...iconProps}>
          <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5H7l-4 2.5V12A8.5 8.5 0 0 1 12 3.5 8.5 8.5 0 0 1 21 12Z" />
          <path d="M8.5 12h7M8.5 9h4" />
        </svg>
      );
    case "profile":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
        </svg>
      );
    case "home":
      return (
        <svg {...iconProps}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "requests":
      return (
        <svg {...iconProps}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="4" cy="6" fill="currentColor" r="1" stroke="none" />
          <circle cx="4" cy="12" fill="currentColor" r="1" stroke="none" />
          <circle cx="4" cy="18" fill="currentColor" r="1" stroke="none" />
        </svg>
      );
    case "vehicle":
      return (
        <svg {...iconProps}>
          <path d="M4 16h16l-1.5-5.5a2 2 0 0 0-1.9-1.5H7.4a2 2 0 0 0-1.9 1.5L4 16Z" />
          <circle cx="7.5" cy="16.5" r="1.5" />
          <circle cx="16.5" cy="16.5" r="1.5" />
        </svg>
      );
  }
}

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <TriWheelLogo
      href="/"
      size={compact ? "sm" : "md"}
      wordmarkClassName="font-bold text-slate-900"
    />
  );
}

export function AppShell({
  children,
  dashboardLabel,
  navItems,
  onLogout,
  user,
}: AppShellProps) {
  const pathname = usePathname();
  const hash = useLocationHash();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, hash]);

  return (
    <div className="tw-page flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white p-6 lg:flex">
        <div className="shrink-0">
          <BrandLink />
          <p className="mt-2 text-sm text-slate-500">{dashboardLabel}</p>
        </div>

        <nav className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <Link
                className={`tw-nav-link ${
                  isNavActive(pathname, hash, item) ? "tw-nav-link-active" : ""
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mt-4 shrink-0 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
            Signed in as
          </p>
          <div className="mt-2 font-bold text-slate-900">{user.name}</div>
          <div className="mt-1 break-all text-xs text-slate-500">{user.email}</div>
          <LogoutConfirmButton
            className="tw-btn-primary mt-4 w-full min-h-11 text-sm"
            onConfirm={onLogout}
          />
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-[1100] border-b border-slate-200 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <BrandLink compact />
          <div className="flex shrink-0 items-center gap-2">
            <LogoutConfirmButton
              className="rounded-xl px-3 py-2 text-xs font-bold text-red-600 ring-1 ring-red-100 transition hover:bg-red-50"
              label="Log out"
              onConfirm={onLogout}
            />
            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Account menu"
              className="flex min-h-11 items-center gap-2 rounded-2xl bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200 transition hover:bg-orange-50 hover:ring-orange-200"
              onClick={() => setMobileMenuOpen((open) => !open)}
              type="button"
            >
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-xs font-black text-white shadow-sm shadow-orange-500/30">
              {userInitials(user.name)}
            </span>
            <svg
              className={`size-4 text-slate-500 transition ${mobileMenuOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
              Signed in as
            </p>
            <p className="mt-2 text-base font-bold text-slate-900">{user.name}</p>
            <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
            <p className="mt-2 text-xs font-medium text-slate-400">{dashboardLabel}</p>
            {pathname !== "/settings" ? (
              <Link
                className="mt-4 flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile settings
              </Link>
            ) : null}
            <LogoutConfirmButton
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
              onConfirm={onLogout}
            />
          </div>
        ) : null}
      </header>

      {mobileMenuOpen ? (
        <button
          aria-label="Close account menu"
          className="fixed inset-0 z-[1099] bg-slate-950/20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          type="button"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:ml-72">
        <div className="flex-1 px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-16 sm:px-6 sm:pb-24 lg:px-6 lg:pb-8 lg:pt-6">
          {children}
        </div>
      </div>

      <nav className="tw-mobile-nav fixed inset-x-0 bottom-0 z-[1100] border-t border-slate-200 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.08)] lg:hidden">
        <div className="overflow-x-auto px-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className="grid min-w-max gap-1"
            style={{
              gridTemplateColumns: `repeat(${navItems.length}, minmax(4.5rem, 1fr))`,
            }}
          >
          {navItems.map((item) => {
            const active = isNavActive(pathname, hash, item);

            return (
              <Link
                className={`tw-mobile-nav-link ${active ? "tw-mobile-nav-link-active" : ""}`}
                href={item.href}
                key={item.href}
              >
                {item.icon ? (
                  <NavIcon className="size-5 shrink-0" name={item.icon} />
                ) : null}
                <span>{item.shortLabel ?? item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          </div>
        </div>
      </nav>
    </div>
  );
}
