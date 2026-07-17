"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { siteConfig } from "@/config/site";

function Brand() {
  return (
    <Link href="/panel" className="flex items-center gap-2 font-bold tracking-tight">
      <img
        src="/assets/mascota-fantasma-icono.svg"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8"
      />
      <span className="text-lg text-foreground">{siteConfig.shortName}</span>
    </Link>
  );
}

function NavItemLink({
  href,
  label,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`rounded-[10px] px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
        active ? "bg-surface text-accent" : "text-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function NavAccordionGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: { label: string; items: { href: string; label: string }[] };
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActiveItem = group.items.some((item) => pathname.startsWith(item.href));
  const [open, setOpen] = useState(hasActiveItem);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center justify-between rounded-[10px] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        {group.label}
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {group.items.map((item) => (
            <NavItemLink key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

// Qué permiso habilita cada link de siteConfig.navGroups — un item sin
// entrada acá se muestra siempre que el grupo sea visible.
const NAV_ITEM_PERMISSION: Record<string, keyof SidebarSession> = {
  "/panel/party": "canViewParty",
  "/panel/eventos": "canManageParty",
};

function NavLinks({ session, onNavigate }: { session?: SidebarSession | null; onNavigate?: () => void }) {
  const pathname = usePathname();

  const navGroups = siteConfig.navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const requiredPermission = NAV_ITEM_PERMISSION[item.href];
        if (!requiredPermission) return true;
        return Boolean(session?.[requiredPermission]);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {siteConfig.nav.map((item) => (
          <NavItemLink key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>

      {navGroups.map((group) => (
        <NavAccordionGroup key={group.label} group={group} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export type SidebarSession = {
  label: string;
  username: string | null;
  avatarUrl: string | null;
  job: string | null;
  isAdmin: boolean;
  canViewParty: boolean;
  canManageParty: boolean;
  canManageRecruitment: boolean;
  isApplicantOnly: boolean;
};

function ProfileCard({ session }: { session: SidebarSession }) {
  return (
    <Link
      href="/panel/perfil"
      className="profile-card group flex items-center gap-3 rounded-[10px] border border-border bg-surface p-3"
    >
      <span className="profile-card__sparkle" style={{ top: "2px", left: "10px", color: "var(--secondary)" }}>
        ✦
      </span>
      <span
        className="profile-card__sparkle"
        style={{ bottom: "4px", left: "38px", color: "var(--focus)", animationDelay: "0.9s" }}
      >
        ✦
      </span>

      {/* Flecha "ver detalles", esquina superior derecha, con globo al hacer hover/foco. */}
      <span className="pointer-events-none absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background-elevated text-accent transition-transform group-hover:scale-110">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="pointer-events-none absolute -top-9 right-0 z-10 whitespace-nowrap rounded-md border border-border bg-background-elevated px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        Ver detalles
        <span className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 border-b border-r border-border bg-background-elevated" />
      </span>

      <div className="profile-card__avatar">
        <span className="profile-card__avatar-glow" />
        <span className="profile-card__ring">
          {session.avatarUrl ? (
            <img
              src={session.avatarUrl}
              alt=""
              width={40}
              height={40}
              className="block h-10 w-10 rounded-full bg-surface"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background-elevated text-sm font-semibold text-muted">
              {session.label.slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>
      </div>

      <div className="relative z-[1] flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-foreground">{session.label}</span>
        {session.username && (
          <span className="truncate text-xs text-muted">@{session.username}</span>
        )}
        {session.job && (
          <span className="profile-card__badge mt-0.5 w-fit truncate rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
            {session.job}
          </span>
        )}
      </div>
    </Link>
  );
}

function AccountBlock({ session }: { session: SidebarSession }) {
  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4 text-sm">
      {session.isAdmin ? (
        <Link
          href="/admin"
          className="rounded-[10px] px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-accent hover:bg-surface"
        >
          Panel de Admin
        </Link>
      ) : (
        session.canManageRecruitment && (
          <Link
            href="/admin/recruitment"
            className="rounded-[10px] px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-accent hover:bg-surface"
          >
            Reclutamiento
          </Link>
        )
      )}
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="w-full rounded-[10px] border border-border px-3 py-2 text-xs text-muted hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

// Un rol "solo postulante" (ver isApplicantOnly en permissions.ts) no tiene
// nada más que ver en el panel — el resto de las rutas lo rebotan de vuelta
// acá igual (proxy.ts), así que ni tiene sentido mostrarle el resto del nav.
function ApplicantNavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      <NavItemLink
        href="/panel/postulacion"
        label="Tu postulación"
        pathname={pathname}
        onNavigate={onNavigate}
      />
    </nav>
  );
}

/** Menú lateral izquierdo (desktop) con menú deslizable equivalente en mobile. */
export function SiteSidebar({ session }: { session?: SidebarSession | null }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* --- Sidebar fijo, solo desktop --- */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-border bg-background p-5 sm:flex">
        <Brand />
        {session && <ProfileCard session={session} />}
        {session?.isApplicantOnly ? (
          <ApplicantNavLinks pathname={pathname} />
        ) : (
          <NavLinks session={session} />
        )}
        {session && <AccountBlock session={session} />}
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
            {session && <ProfileCard session={session} />}
            {session?.isApplicantOnly ? (
              <ApplicantNavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            ) : (
              <NavLinks session={session} onNavigate={() => setDrawerOpen(false)} />
            )}
            {session && <AccountBlock session={session} />}
          </div>
        </div>
      )}
    </>
  );
}
