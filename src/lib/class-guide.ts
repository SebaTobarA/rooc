/**
 * Secciones de la guía de clase (además del árbol de skills). Cada tipo de
 * build de una clase (SavedBuild) guarda una lista por sección, ordenada por
 * prioridad. Fuente única: el editor de /panel/build-pvp y la tarjeta del
 * inicio del panel recorren esta lista.
 */

export type GuideSectionKey = "accessories" | "enchants" | "mounts" | "divineEquip";

export interface GuideEntry {
  /** Ítem, encantamiento o montura, ej. "Anillo del Asesino". */
  name: string;
  /** Alternativas, prioridad o por qué se recomienda. */
  detail: string;
}

export const GUIDE_SECTIONS: { key: GuideSectionKey; label: string; hint: string }[] = [
  { key: "accessories", label: "Accesorios", hint: "Ítems recomendados, alternativas y prioridades." },
  { key: "enchants", label: "Encantamientos", hint: "Opciones recomendadas por pieza de equipo." },
  { key: "mounts", label: "Monturas", hint: "Orden de prioridad y beneficios relevantes." },
  { key: "divineEquip", label: "Equipo divino", hint: "Configuración recomendada y mejoras prioritarias." },
];

/** Lee una sección guardada como JSON, descartando lo que no tenga forma de entrada. */
export function readGuideEntries(value: unknown): GuideEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is { name: unknown; detail?: unknown } => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      name: typeof entry.name === "string" ? entry.name : "",
      detail: typeof entry.detail === "string" ? entry.detail : "",
    }))
    .filter((entry) => entry.name.trim() !== "");
}
