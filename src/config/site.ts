/**
 * Configuración de marca del sitio. Centralizado acá para que el nombre y el
 * copy general se puedan cambiar en un solo lugar cuando definas la marca
 * final. Los placeholders entre corchetes están pensados para reemplazarse.
 */
export const siteConfig = {
  name: "Special Delivery",
  shortName: "Special Delivery",
  tagline: "Base de datos y herramientas para la guild de Ragnarok Online Origin Classic",
  description:
    "Ítems, cartas, bestiario, mapas y tablas de drop para la comunidad de Special Delivery en Ragnarok Online Origin Classic. Proyecto independiente, sin afiliación oficial con Gravity.",
  nav: [
    { href: "/panel", label: "Inicio" },
    { href: "/panel/items", label: "Ítems" },
    { href: "/panel/cards", label: "Cartas" },
    { href: "/panel/monsters", label: "Monstruos" },
    { href: "/panel/maps", label: "Mapas" },
  ],
  navGroups: [
    {
      label: "Administración de la guild",
      items: [
        { href: "/panel/party", label: "Party Builder" },
        { href: "/panel/eventos", label: "Eventos" },
      ],
    },
  ],
};
