/**
 * Configuración de marca del sitio. Centralizado acá para que el nombre y el
 * copy general se puedan cambiar en un solo lugar cuando definas la marca
 * final. Los placeholders entre corchetes están pensados para reemplazarse.
 */
export const siteConfig = {
  name: "[NOMBRE DEL SITIO]",
  shortName: "[SITIO]",
  tagline: "Base de datos y herramientas para Ragnarok Online Origin Classic",
  description:
    "Ítems, bestiario, mapas y tablas de drop para la comunidad de Ragnarok Online Origin Classic. Proyecto independiente, sin afiliación oficial con Gravity ni con otros sitios de la comunidad.",
  nav: [
    { href: "/", label: "Inicio" },
    { href: "/items", label: "Ítems" },
    { href: "/monsters", label: "Monstruos" },
    { href: "/maps", label: "Mapas" },
  ],
};
