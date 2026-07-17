import type { Role } from "@/types/party";

// Transliteradas primero (NFD + sacar diacríticos) y recién después filtradas
// a [a-z] — así "Paladín" da la clave "paladin" en vez de "paladn" (que no
// matchea nada). Mismo truco que ya usa src/lib/discord-job-roles.ts.
function toKey(clase: string): string {
  return clase
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// Aliases normalizados de todas las cadenas de evolución
const CLASS_ROLE: Record<string, Role> = {
  // ── Tanque ────────────────────────────────────────────────────────────────
  // Crusader → Paladin → Imperial Guard
  crusader: "Tank",
  paladin: "Tank",
  imperialguard: "Tank",
  ig: "Tank",

  // ── DPS ───────────────────────────────────────────────────────────────────
  // Swordsman → Knight → Lord Knight → Rune Knight (LK: Tank de emergencia)
  swordsman: "DPS",
  knight: "DPS",
  lordknight: "DPS",
  lk: "DPS",
  runeknight: "DPS",
  rk: "DPS",

  // Archer → Hunter → Sniper → Ranger
  archer: "DPS",
  hunter: "DPS",
  sniper: "DPS",
  ranger: "DPS",

  // Mage → Wizard → High Wizard → Warlock
  mage: "DPS",
  wizard: "DPS",
  highwizard: "DPS",
  hw: "DPS",
  warlock: "DPS",

  // Thief → Assassin → Assassin Cross → Guillotine Cross
  thief: "DPS",
  assassin: "DPS",
  assassincross: "DPS",
  ac: "DPS",
  guillotinecross: "DPS",
  gc: "DPS",

  // Thief → Rogue → Stalker → Shadow Chaser
  rogue: "DPS",
  stalker: "DPS",
  shadowchaser: "DPS",
  sc: "DPS",

  // Merchant → Blacksmith → Mastersmith → Mechanic
  merchant: "DPS",
  blacksmith: "DPS",
  mastersmith: "DPS",
  whitesmith: "DPS",
  ws: "DPS",
  mechanic: "DPS",

  // Acolyte → Monk → Champion → Shura
  monk: "DPS",
  champion: "DPS",
  champ: "DPS",
  shura: "DPS",

  // Gunslinger → Sentry → Rebellion → Nightwatch
  gunslinger: "DPS",
  sentry: "DPS",
  rebellion: "DPS",
  nightwatch: "DPS",

  // ── Soporte ───────────────────────────────────────────────────────────────
  // Acolyte → Priest → High Priest → Archbishop
  acolyte: "Support",
  priest: "Support",
  highpriest: "Support",
  hp: "Support",
  archbishop: "Support",

  // Mage → Sage → Professor → Sorcerer
  sage: "DPS",
  professor: "DPS",
  prof: "DPS",
  sorcerer: "DPS",

  // Archer → Bard → Minstrel → Maestro
  bard: "Support",
  minstrel: "Support",
  maestro: "Support",
  clown: "Support",

  // Archer → Dancer → Gypsy → Wanderer
  dancer: "Support",
  gypsy: "Support",
  wanderer: "Support",

  // Merchant → Alchemist → Biochemist → Geneticist / Creator
  alchemist: "Support",
  biochemist: "Support",
  geneticist: "Support",
  creator: "Support",

  // ── DPS / Doram ───────────────────────────────────────────────────────────
  // Toda la cadena Doram se normaliza a "Doram" en el import (ver normalizeClass)
  doram: "DPS",
};

// Aliases de la cadena Doram (se normalizan a clase "Doram" al importar)
const DORAM_KEYS = new Set(["apprentice", "tobesummoner", "summoner", "grandsummoner", "doram"]);

/**
 * Normaliza el nombre de clase antes de mostrarlo.
 * Toda la cadena Doram queda como "Doram".
 */
export function normalizeClass(clase: string): string {
  const key = toKey(clase);
  if (DORAM_KEYS.has(key)) return "Doram";
  return clase;
}

/** Infiere el rol a partir del nombre de clase (ya normalizado). */
export function inferRole(clase: string): Role {
  const key = toKey(clase);
  if (DORAM_KEYS.has(key)) return "DPS";
  return CLASS_ROLE[key] ?? "Flexible";
}

/** Lord Knight puede cubrir Tank de emergencia cuando no hay Paladines. */
export function isLordKnight(clase: string): boolean {
  const key = toKey(clase);
  return key === "lordknight" || key === "lk";
}

/**
 * Músicos (Bard/Gypsy y evoluciones) — máximo 1 por party.
 */
export function isMusicianClass(clase: string): boolean {
  const key = toKey(clase);
  return ["bard", "minstrel", "maestro", "clown", "dancer", "gypsy", "wanderer"].includes(key);
}

/**
 * Healers puros (Priest / High Priest / Archbishop) — máximo 1 por party.
 */
export function isHealerClass(clase: string): boolean {
  const key = toKey(clase);
  return ["acolyte", "priest", "highpriest", "hp", "archbishop"].includes(key);
}

/**
 * Creator/Biochemist — soporte de última prioridad, no cuenta para el límite
 * de músico ni de healer, puede convivir con cualquiera de los dos.
 */
export function isCreatorClass(clase: string): boolean {
  const key = toKey(clase);
  return ["alchemist", "biochemist", "geneticist", "creator"].includes(key);
}
