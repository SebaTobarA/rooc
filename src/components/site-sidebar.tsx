"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { siteConfig, type NavGroup, type NavItem } from "@/config/site";

function Brand() {
  return (
    <Link href="/panel" className="flex items-center gap-2.5">
      <img src="/assets/mascota-fantasma-icono.svg" alt="" width={36} height={36} className="h-9 w-9" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-bold text-foreground">{siteConfig.shortName}</span>
        <span className="truncate text-[11px] text-muted">Ragnarok Online Origin Classic</span>
      </span>
    </Link>
  );
}

function isActive(item: Pick<NavItem, "href" | "exact" | "alsoActiveOn">, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return [item.href, ...(item.alsoActiveOn ?? [])].some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}

function NavItemLink({
  item,
  pathname,
  onNavigate,
  badge,
  nested = false,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  badge?: number;
  nested?: boolean;
}) {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${
        nested ? "pl-4 pr-3" : "px-3"
      } ${active ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" aria-hidden="true" />}
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {Boolean(badge) && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavAccordionGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActiveItem = group.items.some((item) => isActive(item, pathname));
  const [open, setOpen] = useState(hasActiveItem);
  const Icon = group.icon;

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface hover:text-foreground ${
          hasActiveItem ? "text-foreground" : "text-muted"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-1">
          {group.items.map((item) => (
            <NavItemLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} nested />
          ))}
        </div>
      )}
    </div>
  );
}

function NavLinks({ session, onNavigate }: { session?: SidebarSession | null; onNavigate?: () => void }) {
  const pathname = usePathname();

  const navGroups = siteConfig.navGroups
    .map((group) => ({
      ...group,
      // Cada link declara qué permiso lo habilita (ver siteConfig.navGroups).
      items: group.items.filter((item) => !item.requires || Boolean(session?.[item.requires])),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-0.5">
      {siteConfig.nav.map((item) => (
        <NavItemLink
          key={item.href}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
          badge={item.href === "/panel" ? session?.pendingEventsCount : undefined}
        />
      ))}

      {navGroups.length > 0 && <div className="my-3 border-t border-border" aria-hidden="true" />}

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
  pendingEventsCount: number;
};

/** Perfil de quien inició sesión, al pie del menú: lleva al inicio, que es su perfil. */
function ProfileFooter({ session, onNavigate }: { session: SidebarSession; onNavigate?: () => void }) {
  return (
    <div className="mt-auto border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <Link
          href="/panel"
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-surface"
        >
          {session.avatarUrl ? (
            <img
              src={session.avatarUrl}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full border border-accent/40"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-surface text-sm font-semibold text-muted">
              {session.label.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{session.label}</span>
            {session.username && <span className="truncate text-xs text-muted">@{session.username}</span>}
            <span className="mt-1 flex flex-wrap gap-1">
              {session.isAdmin && (
                <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-px text-[10px] font-semibold text-accent">
                  Admin
                </span>
              )}
              {session.job && (
                <span className="rounded-full border border-border px-2 py-px text-[10px] font-medium text-muted">
                  {session.job}
                </span>
              )}
            </span>
          </span>
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Un rol "solo postulante" (ver isApplicantOnly en permissions.ts) no tiene
// nada más que ver en el panel — el resto de las rutas lo rebotan de vuelta
// acá igual (proxy.ts), así que ni tiene sentido mostrarle el resto del nav.
function ApplicantNavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      <NavItemLink
        item={{ ...siteConfig.nav[0], href: "/panel/postulacion", label: "Tu postulación", exact: false }}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    </nav>
  );
}

function SidebarContent({ session, onNavigate }: { session?: SidebarSession | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {session?.isApplicantOnly ? (
        <ApplicantNavLinks pathname={pathname} onNavigate={onNavigate} />
      ) : (
        <NavLinks session={session} onNavigate={onNavigate} />
      )}
      {session && <ProfileFooter session={session} onNavigate={onNavigate} />}
    </>
  );
}

/** Menú lateral izquierdo (desktop) con menú deslizable equivalente en mobile. */
export function SiteSidebar({ session }: { session?: SidebarSession | null }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* --- Sidebar fijo, solo desktop --- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-background-elevated p-4 sm:flex">
        <Brand />
        <SidebarContent session={session} />
      </aside>

      {/* --- Barra superior + botón hamburguesa, solo mobile --- */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background-elevated/95 px-4 py-3 backdrop-blur sm:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground"
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
        >
          <Menu className="h-5 w-5" />
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
          <div className="relative flex h-full w-72 flex-col gap-6 overflow-y-auto border-r border-border bg-background-elevated p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent session={session} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
