"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { LogoutConfirmButton } from "./LogoutConfirmButton";

export type AppNavItem = {
  href: string;
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

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="inline-flex min-w-0 items-center gap-2.5" href="/">
      <span
        className={`relative shrink-0 overflow-hidden rounded-xl bg-black shadow-sm ${
          compact ? "h-8 w-14" : "h-10 w-[4.5rem]"
        }`}
      >
        <Image
          alt=""
          aria-hidden="true"
          className="object-contain p-0.5"
          fill
          sizes={compact ? "56px" : "72px"}
          src="/triwheel-brand-logo-v2.png"
        />
      </span>
      <span
        className={`truncate font-bold text-slate-900 ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        TriWheel
      </span>
    </Link>
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

      <header className="fixed inset-x-0 top-0 z-[1100] border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <BrandLink compact />
          <span className="truncate text-sm font-medium text-slate-500">
            {dashboardLabel}
          </span>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-72">
        <div className="flex-1 px-4 pb-28 pt-16 sm:px-6 sm:pb-24 lg:px-6 lg:pb-8 lg:pt-6">
          {children}
        </div>
      </div>

      <nav className="tw-mobile-nav fixed inset-x-0 bottom-0 z-[1100] border-t border-slate-200 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.08)] lg:hidden">
        <div
          className="grid gap-1 px-2 pt-2"
          style={{
            gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
          }}
        >
          {navItems.map((item) => (
            <Link
              className={`tw-mobile-nav-link ${
                isNavActive(pathname, hash, item)
                  ? "bg-orange-50 text-orange-700"
                  : ""
              }`}
              href={item.href}
              key={item.href}
            >
              <span>{item.shortLabel ?? item.label.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
