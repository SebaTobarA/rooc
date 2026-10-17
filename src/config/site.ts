/**
 * Configuración de marca del sitio. Centralizado acá para que el nombre y el
 * copy general se puedan cambiar en un solo lugar cuando definas la marca
 * final. Los placeholders entre corchetes están pensados para reemplazarse.
 */

import {
  CalendarDays,
  ClipboardCheck,
  Contact,
  Crown,
  Database,
  Gem,
  House,
  KeyRound,
  Layers,
  LayoutDashboard,
  Map as MapIcon,
  Network,
  Package,
  ShieldCheck,
  Skull,
  SlidersHorizontal,
  Sword,
  Swords,
  Upload,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Permiso de la sesión que habilita un link del menú lateral (ver SidebarSession). */
export type NavPermission = "canViewParty" | "canManageParty" | "canManageRecruitment" | "isAdmin";

export type NavItem = {
  href: string;
  label: string;
  /** Sin esto el link se muestra a cualquiera que vea el panel. */
  requires?: NavPermission;
  /** El link solo se marca activo en su ruta exacta, no en las que cuelgan de ella. */
  exact?: boolean;
  /** Otras rutas que también lo marcan activo (secciones que cuelgan de este menú sin compartir su URL). */
  alsoActiveOn?: string[];
  /** Ícono del menú lateral; también encabeza la página en el admin. */
  icon: LucideIcon;
};

export type NavGroup = { label: string; icon: LucideIcon; items: NavItem[] };

// Los menús que ve cualquier jugador. La base de datos ya no es una pestaña:
// sus datos quedan de fondo para armar las guías de clase.
const nav: NavItem[] = [
  { href: "/panel", label: "Inicio", exact: true, icon: House },
  { href: "/panel/personaje", label: "Mi personaje", alsoActiveOn: ["/panel/ficha"], icon: UserRound },
];

// Menús del staff, debajo de los tres de arriba: no hay un "panel de admin"
// aparte con su propia barra. Cada grupo se muestra solo si a la persona le
// queda algún link visible, así que un jugador sin permisos no ve ninguno.
const navGroups: NavGroup[] = [
  {
    label: "Administración",
    icon: ShieldCheck,
    items: [
      { href: "/panel/party", label: "Party Builder", requires: "canViewParty", icon: Users },
      { href: "/panel/build-pvp", label: "Guías de clase", requires: "isAdmin", icon: Swords },
      { href: "/panel/eventos", label: "Eventos", requires: "canManageParty", icon: CalendarDays },
      { href: "/admin/evaluacion-core", label: "Evaluación de CORE", requires: "isAdmin", icon: ClipboardCheck },
      { href: "/admin/requisitos-core", label: "Configuración de requisitos", requires: "isAdmin", icon: SlidersHorizontal },
      { href: "/admin/recruitment", label: "Reclutamiento", requires: "canManageRecruitment", icon: UserPlus },
      { href: "/admin/members", label: "Miembros", requires: "isAdmin", icon: Contact },
      { href: "/admin/leadership", label: "Liderazgo", requires: "isAdmin", icon: Crown },
      { href: "/admin/roles", label: "Roles y permisos", requires: "isAdmin", icon: KeyRound },
    ],
  },
  {
    label: "Contenido",
    icon: Database,
    items: [
      { href: "/admin", label: "Resumen", requires: "isAdmin", exact: true, icon: LayoutDashboard },
      { href: "/admin/items", label: "Equipamiento", requires: "isAdmin", icon: Sword },
      { href: "/admin/cards", label: "Cartas", requires: "isAdmin", icon: Gem },
      { href: "/admin/sets", label: "Sets", requires: "isAdmin", icon: Layers },
      { href: "/admin/monsters", label: "Monstruos", requires: "isAdmin", icon: Skull },
      { href: "/admin/maps", label: "Mapas", requires: "isAdmin", icon: MapIcon },
      { href: "/admin/drops", label: "Drops", requires: "isAdmin", icon: Package },
      { href: "/admin/build-pvp", label: "Árbol de skills", requires: "isAdmin", icon: Network },
      { href: "/admin/import", label: "Importar CSV/JSON", requires: "isAdmin", icon: Upload },
    ],
  },
];

export const siteConfig = {
  name: "Special Delivery",
  shortName: "Special Delivery",
  tagline: "Base de datos y herramientas para la guild de Ragnarok Online Origin Classic",
  description:
    "Ítems, cartas, bestiario, mapas y tablas de drop para la comunidad de Special Delivery en Ragnarok Online Origin Classic. Proyecto independiente, sin afiliación oficial con Gravity.",
  nav,
  navGroups,
};
