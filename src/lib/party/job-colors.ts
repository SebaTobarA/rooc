/**
 * Color de cada job en el Party Builder y en "Mi composición" del inicio del
 * panel. La paleta es una sola para toda la guild: la configura un oficial
 * desde el Party Builder (PartyJobColors en la base) y así todos ven qué tipo
 * de party les toca con los mismos colores. Este archivo es puro: lo usan el
 * servidor y el cliente.
 */

export type JobColors = Record<string, string>;

export const DEFAULT_JOB_COLORS: JobColors = {
  "Lord Knight": "#e5484d",
  Paladín: "#f2c94c",
  Gypsy: "#f06292",
  Clown: "#ff9f43",
  Stalker: "#8e7cc3",
  Champion: "#d08770",
  "High Priest": "#f5f5f5",
  Creator: "#7bd88f",
  Whitesmith: "#b0bec5",
  "Assassin Cross": "#9b59b6",
  Sniper: "#2ecc71",
  Gunslinger: "#c0a16b",
  Professor: "#5dade2",
  "High Wizard": "#3d7eff",
  Doram: "#6fe0f5",
};

export const FALLBACK_JOB_COLOR = "#7a8794";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** La paleta guardada encima de la de por defecto; descarta lo que no sea un color #rrggbb. */
export function readJobColors(data: unknown): JobColors {
  const colors: JobColors = { ...DEFAULT_JOB_COLORS };
  if (data && typeof data === "object") {
    for (const [job, color] of Object.entries(data as Record<string, unknown>)) {
      if (job.length <= 40 && typeof color === "string" && HEX_COLOR.test(color)) colors[job] = color.toLowerCase();
    }
  }
  return colors;
}

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Color de un job, sin importar tildes ni mayúsculas ("Paladin" = "Paladín"). */
export function jobColor(colors: JobColors, job: string | null | undefined): string {
  if (!job) return FALLBACK_JOB_COLOR;
  if (colors[job]) return colors[job];
  const key = plain(job);
  const match = Object.keys(colors).find((candidate) => plain(candidate) === key);
  return match ? colors[match] : FALLBACK_JOB_COLOR;
}
