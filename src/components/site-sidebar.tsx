"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { siteConfig } from "@/config/site";

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
        R
      </span>
      <span className="text-lg text-foreground">{siteConfig.shortName}</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {siteConfig.nav.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-[10px] px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
              active
                ? "bg-surface text-accent"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Menú lateral izquierdo (desktop) con menú deslizable equivalente en mobile. */
export function SiteSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* --- Sidebar fijo, solo desktop --- */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-border bg-background p-5 sm:flex">
        <Brand />
        <NavLinks />
      </aside>

      {/* --- Barra superior + botón hamburguesa, solo mobile --- */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground"
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* --- Menú deslizable desde la izquierda, solo mobile --- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="relative flex h-full w-64 flex-col gap-6 border-r border-border bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground"
                aria-label="Cerrar menú"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
