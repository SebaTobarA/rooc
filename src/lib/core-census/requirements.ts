/**
 * Aspectos de la ficha Core y sus mínimos. Esta lista define QUÉ se evalúa
 * (campos, etiquetas, orden) y los mínimos por defecto; los mínimos vigentes
 * los fijan los oficiales en /admin/requisitos-core y se leen con
 * loadSheetRequirements (requirements-config.ts), que los aplica encima de
 * estos. La ficha, el listado y la vista del jugador recorren esa lista.
 *
 * Para agregar un aspecto: sumarlo acá y agregar la columna con el mismo
 * nombre en CoreCharacterSheet, CoreSheetRevision y CoreSheetSubmission.
 */

export type SheetNumberField = "power" | "refine" | "medals" | "mr" | "feathers" | "enchants";
export type SheetBooleanField = "cardsPvp" | "s2Orange" | "skillTreePvp";
export type SheetField = SheetNumberField | SheetBooleanField;

export type SheetValues = Record<SheetNumberField, number | null> & Record<SheetBooleanField, boolean | null>;

export type SheetRequirement =
  | {
      field: SheetNumberField;
      kind: "number";
      label: string;
      /** 0 = sin mínimo: el dato se anota pero no se exige. */
      min: number;
      prefix: string;
    }
  | {
      field: SheetBooleanField;
      kind: "boolean";
      label: string;
      yes: string;
      no: string;
      /** Qué se pide cuando es exigido, ej. "Cartas PVP". */
      description: string;
      /** false = el dato se anota pero no se exige. */
      required: boolean;
    };

export const SHEET_REQUIREMENTS: SheetRequirement[] = [
  { field: "power", kind: "number", label: "Poder", min: 0, prefix: "" },
  { field: "refine", kind: "number", label: "Refine", min: 14, prefix: "+" },
  { field: "medals", kind: "number", label: "Medallas", min: 170_000, prefix: "" },
  { field: "mr", kind: "number", label: "MR", min: 20, prefix: "+" },
  { field: "feathers", kind: "number", label: "Plumas", min: 9, prefix: "+" },
  { field: "enchants", kind: "number", label: "Enchants", min: 30, prefix: "+" },
  { field: "cardsPvp", kind: "boolean", label: "Cartas", yes: "PVP", no: "No PVP", description: "Cartas PVP", required: true },
  {
    field: "s2Orange",
    kind: "boolean",
    label: "Equipo S2",
    yes: "Naranja",
    no: "No naranja",
    description: "Equipo S2 naranja",
    required: true,
  },
  {
    field: "skillTreePvp",
    kind: "boolean",
    label: "Skill",
    yes: "Sí",
    no: "Mejorar",
    description: "Árbol de skills PVP",
    required: true,
  },
];

/** Lo que guarda CoreRequirementSettings.mins: mínimo por campo numérico, exigido o no por campo sí/no. */
export type RequirementOverrides = Partial<Record<SheetNumberField, number>> &
  Partial<Record<SheetBooleanField, boolean>>;

/** La lista de arriba con los mínimos configurados por los oficiales encima de los de por defecto. */
export function applyRequirementOverrides(overrides: RequirementOverrides): SheetRequirement[] {
  return SHEET_REQUIREMENTS.map((requirement) => {
    if (requirement.kind === "number") {
      const min = overrides[requirement.field];
      return typeof min === "number" && Number.isFinite(min) && min >= 0 ? { ...requirement, min } : requirement;
    }
    const required = overrides[requirement.field];
    return typeof required === "boolean" ? { ...requirement, required } : requirement;
  });
}

const NUMBER_FORMATTER = new Intl.NumberFormat("es-CL");

/** Texto corto del mínimo, ej. "Mínimo +14", "Sin mínimo", "Cartas PVP". */
export function requirementHint(requirement: SheetRequirement): string {
  if (requirement.kind === "number") {
    return requirement.min > 0
      ? `Mínimo ${requirement.prefix}${NUMBER_FORMATTER.format(requirement.min)}`
      : "Sin mínimo";
  }
  return requirement.required ? requirement.description : `${requirement.description} (no exigido)`;
}

/**
 * "ok" cumple el mínimo, "fail" no lo cumple, "pending" todavía no hay dato,
 * "neutral" hay dato pero ese aspecto no se exige.
 */
export type RequirementStatus = "ok" | "fail" | "pending" | "neutral";

export function requirementStatus(requirement: SheetRequirement, sheet: SheetValues | null): RequirementStatus {
  if (!sheet) return "pending";
  if (requirement.kind === "number") {
    const value = sheet[requirement.field];
    if (value === null) return "pending";
    if (requirement.min <= 0) return "neutral";
    return value >= requirement.min ? "ok" : "fail";
  }
  const value = sheet[requirement.field];
  if (value === null) return "pending";
  if (!requirement.required) return "neutral";
  return value ? "ok" : "fail";
}

export function formatRequirementValue(requirement: SheetRequirement, sheet: SheetValues | null): string {
  if (!sheet) return "—";
  if (requirement.kind === "number") {
    const value = sheet[requirement.field];
    return value === null ? "—" : `${requirement.prefix}${NUMBER_FORMATTER.format(value)}`;
  }
  const value = sheet[requirement.field];
  return value === null ? "—" : value ? requirement.yes : requirement.no;
}

/** Cuántos aspectos exigidos cumple, no cumple o le faltan; los no exigidos no cuentan. */
export function countRequirements(
  requirements: SheetRequirement[],
  sheet: SheetValues | null
): { ok: number; fail: number; pending: number; required: number } {
  const count = { ok: 0, fail: 0, pending: 0, required: 0 };
  for (const requirement of requirements) {
    const exacted = requirement.kind === "number" ? requirement.min > 0 : requirement.required;
    if (!exacted) continue;
    count.required += 1;
    const status = requirementStatus(requirement, sheet);
    if (status !== "neutral") count[status] += 1;
  }
  return count;
}

/** Los valores de la ficha tal como se guardan, a partir de cualquier fila que los tenga. */
export function pickSheetValues(source: SheetValues): SheetValues {
  return {
    power: source.power,
    refine: source.refine,
    medals: source.medals,
    mr: source.mr,
    feathers: source.feathers,
    enchants: source.enchants,
    cardsPvp: source.cardsPvp,
    s2Orange: source.s2Orange,
    skillTreePvp: source.skillTreePvp,
  };
}
