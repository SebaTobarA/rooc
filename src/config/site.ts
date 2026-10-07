/**
 * Configuración de marca del sitio. Centralizado acá para que el nombre y el
 * copy general se puedan cambiar en un solo lugar cuando definas la marca
 * final. Los placeholders entre corchetes están pensados para reemplazarse.
 */

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
};

export type NavGroup = { label: string; items: NavItem[] };

// Los tres menús que ve cualquier jugador. "Base de datos" y "Mi personaje"
// son portadas: desde ahí se entra a sus secciones.
const nav: NavItem[] = [
  { href: "/panel", label: "Inicio", exact: true },
  {
    href: "/panel/base-de-datos",
    label: "Base de datos",
    alsoActiveOn: ["/panel/items", "/panel/cards", "/panel/monsters", "/panel/maps"],
  },
  { href: "/panel/personaje", label: "Mi personaje", alsoActiveOn: ["/panel/ficha"] },
];

// Menús del staff, debajo de los tres de arriba: no hay un "panel de admin"
// aparte con su propia barra. Cada grupo se muestra solo si a la persona le
// queda algún link visible, así que un jugador sin permisos no ve ninguno.
const navGroups: NavGroup[] = [
  {
    label: "Administración de la guild",
    items: [
      { href: "/panel/party", label: "Party Builder", requires: "canViewParty" },
      { href: "/panel/build-pvp", label: "Build PVP", requires: "canViewParty" },
      { href: "/panel/eventos", label: "Eventos", requires: "canManageParty" },
      { href: "/admin/evaluacion-core", label: "Evaluación de CORE", requires: "isAdmin" },
      { href: "/admin/requisitos-core", label: "Configuración de requisitos", requires: "isAdmin" },
      { href: "/admin/core-guild", label: "Organización Core", requires: "isAdmin" },
      { href: "/admin/recruitment", label: "Reclutamiento", requires: "canManageRecruitment" },
      { href: "/admin/members", label: "Miembros", requires: "isAdmin" },
      { href: "/admin/registro", label: "Registro", requires: "isAdmin" },
      { href: "/admin/leadership", label: "Liderazgo", requires: "isAdmin" },
      { href: "/admin/roles", label: "Roles y permisos", requires: "isAdmin" },
    ],
  },
  {
    label: "Contenido del sitio",
    items: [
      { href: "/admin", label: "Resumen", requires: "isAdmin", exact: true },
      { href: "/admin/items", label: "Equipamiento", requires: "isAdmin" },
      { href: "/admin/cards", label: "Cartas", requires: "isAdmin" },
      { href: "/admin/sets", label: "Sets", requires: "isAdmin" },
      { href: "/admin/monsters", label: "Monstruos", requires: "isAdmin" },
      { href: "/admin/maps", label: "Mapas", requires: "isAdmin" },
      { href: "/admin/drops", label: "Drops", requires: "isAdmin" },
      { href: "/admin/build-pvp", label: "Árbol de skills", requires: "isAdmin" },
      { href: "/admin/import", label: "Importar CSV/JSON", requires: "isAdmin" },
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
