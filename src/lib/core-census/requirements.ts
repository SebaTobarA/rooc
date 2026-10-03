/**
 * Mínimos de equipo que tiene que cumplir un miembro del rol [SD] Core —
 * fuente única: la ficha (/admin/core-guild/censo/miembro/[id]), el panel del
 * censo y la vista del jugador en /panel/perfil recorren esta misma lista.
 * Para cambiar un mínimo o agregar un aspecto alcanza con tocar acá (y la
 * columna en CoreCharacterSheet si es un aspecto nuevo).
 */

export type SheetNumberField = "refine" | "medals" | "mr" | "feathers" | "enchants";
export type SheetBooleanField = "cardsPvp" | "s2Orange" | "skillTreePvp";

export type SheetValues = Record<SheetNumberField, number | null> & Record<SheetBooleanField, boolean | null>;

export type SheetRequirement =
  | { field: SheetNumberField; kind: "number"; label: string; min: number; prefix: string; hint: string }
  | { field: SheetBooleanField; kind: "boolean"; label: string; yes: string; no: string; hint: string };

export const SHEET_REQUIREMENTS: SheetRequirement[] = [
  { field: "refine", kind: "number", label: "Refine", min: 14, prefix: "+", hint: "Mínimo +14" },
  { field: "medals", kind: "number", label: "Medallas", min: 170_000, prefix: "", hint: "Mínimo 170.000" },
  { field: "mr", kind: "number", label: "MR", min: 20, prefix: "+", hint: "Mínimo +20" },
  { field: "feathers", kind: "number", label: "Plumas", min: 9, prefix: "+", hint: "Mínimo +9" },
  { field: "enchants", kind: "number", label: "Enchants", min: 30, prefix: "+", hint: "Mínimo +30" },
  { field: "cardsPvp", kind: "boolean", label: "Cartas", yes: "PVP", no: "No PVP", hint: "Cartas PVP" },
  { field: "s2Orange", kind: "boolean", label: "Equipo S2", yes: "Naranja", no: "No naranja", hint: "Equipo S2 naranja" },
  { field: "skillTreePvp", kind: "boolean", label: "Skill", yes: "Sí", no: "Mejorar", hint: "Árbol de skills PVP" },
];

/** "ok" cumple el mínimo, "fail" no lo cumple, "pending" todavía no se evaluó. */
export type RequirementStatus = "ok" | "fail" | "pending";

export function requirementStatus(requirement: SheetRequirement, sheet: SheetValues | null): RequirementStatus {
  if (!sheet) return "pending";
  if (requirement.kind === "number") {
    const value = sheet[requirement.field];
    if (value === null) return "pending";
    return value >= requirement.min ? "ok" : "fail";
  }
  const value = sheet[requirement.field];
  if (value === null) return "pending";
  return value ? "ok" : "fail";
}

const NUMBER_FORMATTER = new Intl.NumberFormat("es-CL");

export function formatRequirementValue(requirement: SheetRequirement, sheet: SheetValues | null): string {
  if (!sheet) return "—";
  if (requirement.kind === "number") {
    const value = sheet[requirement.field];
    return value === null ? "—" : `${requirement.prefix}${NUMBER_FORMATTER.format(value)}`;
  }
  const value = sheet[requirement.field];
  return value === null ? "—" : value ? requirement.yes : requirement.no;
}

export function countRequirements(sheet: SheetValues | null): { ok: number; fail: number; pending: number } {
  const count = { ok: 0, fail: 0, pending: 0 };
  for (const requirement of SHEET_REQUIREMENTS) count[requirementStatus(requirement, sheet)] += 1;
  return count;
}
