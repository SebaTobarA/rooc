/**
 * Definición del formato de columnas esperado por cada tabla importable —
 * fuente única usada tanto por el formulario (para mostrar el formato de la
 * tabla elegida y generar la plantilla descargable) como por el endpoint de
 * importación. Sin dependencias de servidor (Prisma, etc.) para poder
 * importarse también desde el componente cliente.
 *
 * Cada campo trae un `example` con un valor real y válido — la plantilla
 * descargable se arma con una fila completa (no vacía) para que sirva como
 * modelo a duplicar y editar, en vez de solo mostrar los nombres de columna.
 */

export type ImportFieldDef = {
  name: string;
  required: boolean;
  hint?: string;
  example: string;
};

export type ImportEntityDef = {
  value: string;
  label: string;
  fields: ImportFieldDef[];
  notes?: string;
};

export const IMPORT_ENTITIES: ImportEntityDef[] = [
  {
    value: "items",
    label: "Ítems / equipamiento",
    fields: [
      { name: "name", required: true, example: "Espada de Hierro" },
      { name: "category", required: false, hint: 'por defecto "equipo"', example: "equipo" },
      {
        name: "slot",
        required: true,
        hint: "WEAPON, SHIELD, HEAD_TOP, HEAD_MID, HEAD_LOW, ARMOR, GARMENT, SHOES, ACCESSORY",
        example: "WEAPON",
      },
      {
        name: "weaponType",
        required: false,
        hint: "NONE, SWORD, DAGGER, TWO_HAND_SWORD, SPEAR, AXE, HATCHET, MACE, ROD, STAFF, BOW, CROSSBOW, KNUCKLE, INSTRUMENT, WHIP, BOOK, KATAR, CASE, GRASS, SCYTHE (solo si slot es WEAPON)",
        example: "SWORD",
      },
      { name: "levelReq", required: true, example: "10" },
      {
        name: "rarity",
        required: false,
        hint: "COMUN, POCO_COMUN, RARO, EPICO, LEGENDARIO",
        example: "POCO_COMUN",
      },
      { name: "description", required: false, example: "Espada básica forjada en hierro." },
      { name: "stats", required: false, hint: "texto libre, ej: +10 ATK, +5 DES", example: "+10 ATK" },
      { name: "iconUrl", required: false, example: "https://ejemplo.com/iconos/espada-hierro.png" },
    ],
  },
  {
    value: "cards",
    label: "Cartas",
    fields: [
      { name: "name", required: true, example: "Poring Card" },
      {
        name: "slot",
        required: true,
        hint: "MAIN_HAND, OFF_HAND, ARMOR, CLOAK, SHOES, ACCESSORY, PENDIENTE, HEADWEAR, FACEWEAR, MOUTHWEAR, BACKWEAR, COSTUME",
        example: "ARMOR",
      },
      { name: "rarity", required: false, hint: "VERDE, AZUL, MORADA", example: "VERDE" },
      { name: "classRestriction", required: false, example: "" },
      { name: "description", required: false, example: "Carta obtenida del monstruo Poring." },
      { name: "ability", required: false, example: "+10% HP máximo" },
      { name: "stats", required: false, example: "VIT +1" },
      { name: "collectionBonus", required: false, example: "" },
      { name: "awaken", required: false, example: "" },
      { name: "refine", required: false, example: "" },
      { name: "iconUrl", required: false, example: "https://ejemplo.com/iconos/poring-card.png" },
    ],
  },
  {
    value: "monsters",
    label: "Monstruos",
    fields: [
      { name: "name", required: true, example: "Poring" },
      { name: "level", required: true, example: "1" },
      { name: "hp", required: true, example: "50" },
      { name: "atk", required: true, example: "8" },
      { name: "atkMax", required: false, example: "12" },
      { name: "def", required: false, example: "0" },
      {
        name: "element",
        required: false,
        hint: "NEUTRO, AGUA, TIERRA, FUEGO, VIENTO, VENENO, SAGRADO, SOMBRA, FANTASMA, NO_MUERTO",
        example: "AGUA",
      },
      { name: "elementLevel", required: false, hint: "1 a 4", example: "1" },
      {
        name: "race",
        required: true,
        hint: "HUMANOIDE, BESTIA, PLANTA, NO_MUERTO, DEMONIO, INSECTO, PEZ, ANGEL, DRAGON, AMORFO",
        example: "PLANTA",
      },
      { name: "size", required: false, hint: "PEQUENO, MEDIANO, GRANDE", example: "PEQUENO" },
      { name: "description", required: false, example: "Monstruo básico de campo, ideal para principiantes." },
      { name: "iconUrl", required: false, example: "https://ejemplo.com/iconos/poring.png" },
    ],
  },
  {
    value: "maps",
    label: "Mapas",
    fields: [
      { name: "name", required: true, example: "Prontera" },
      { name: "region", required: true, example: "Ciudad Central" },
      { name: "description", required: false, example: "Ciudad principal del reino de Rune-Midgarts." },
    ],
  },
  {
    value: "drops",
    label: "Drops",
    fields: [
      { name: "monster", required: true, hint: "nombre o slug de un monstruo ya cargado", example: "Poring" },
      {
        name: "item",
        required: true,
        hint: "nombre o slug de un ítem ya cargado",
        example: "Espada de Hierro",
      },
      { name: "rate", required: true, hint: "porcentaje, 0 a 100", example: "70" },
    ],
    notes: "Carga los monstruos y los ítems antes que sus drops.",
  },
  {
    value: "skills",
    label: "Habilidades (Build PVP)",
    fields: [
      {
        name: "job",
        required: true,
        hint: "nombre exacto de la clase ya creada en /admin/build-pvp",
        example: "Knight",
      },
      { name: "name", required: true, example: "Bash" },
      { name: "maxLevel", required: false, hint: "por defecto 10", example: "10" },
      { name: "col", required: false, hint: "columna en la grilla del árbol, por defecto 0", example: "0" },
      { name: "row", required: false, hint: "fila en la grilla del árbol, por defecto 0", example: "0" },
      { name: "iconUrl", required: false, example: "https://ejemplo.com/iconos/bash.png" },
      {
        name: "levelDescriptions",
        required: false,
        hint: 'una descripción por nivel, separadas por "|"',
        example:
          "+10% daño|+20% daño|+30% daño|+40% daño|+50% daño|+60% daño|+70% daño|+80% daño|+90% daño|+100% daño",
      },
      {
        name: "prerequisites",
        required: false,
        hint: 'formato "Habilidad:nivel, Otra habilidad:nivel" — deben existir en la misma clase',
        example: "",
      },
    ],
    notes: "Crea primero la clase (job) desde /admin/build-pvp antes de importar sus habilidades.",
  },
];

export function getImportEntity(value: string): ImportEntityDef | undefined {
  return IMPORT_ENTITIES.find((entity) => entity.value === value);
}
