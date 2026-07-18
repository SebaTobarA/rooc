/**
 * Definición del formato de columnas esperado por cada tabla importable —
 * fuente única usada tanto por el formulario (para mostrar el formato de la
 * tabla elegida y generar la plantilla descargable) como por el endpoint de
 * importación. Sin dependencias de servidor (Prisma, etc.) para poder
 * importarse también desde el componente cliente.
 */

export type ImportFieldDef = {
  name: string;
  required: boolean;
  hint?: string;
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
      { name: "name", required: true },
      { name: "category", required: false, hint: 'por defecto "equipo"' },
      {
        name: "slot",
        required: true,
        hint: "WEAPON, SHIELD, HEAD_TOP, HEAD_MID, HEAD_LOW, ARMOR, GARMENT, SHOES, ACCESSORY",
      },
      {
        name: "weaponType",
        required: false,
        hint: "NONE, SWORD, DAGGER, TWO_HAND_SWORD, SPEAR, AXE, HATCHET, MACE, ROD, STAFF, BOW, CROSSBOW, KNUCKLE, INSTRUMENT, WHIP, BOOK, KATAR, CASE, GRASS, SCYTHE (solo si slot es WEAPON)",
      },
      { name: "levelReq", required: true },
      { name: "rarity", required: false, hint: "COMUN, POCO_COMUN, RARO, EPICO, LEGENDARIO" },
      { name: "description", required: false },
      { name: "stats", required: false, hint: "texto libre, ej: +10 ATK, +5 DES" },
      { name: "iconUrl", required: false },
    ],
  },
  {
    value: "cards",
    label: "Cartas",
    fields: [
      { name: "name", required: true },
      {
        name: "slot",
        required: true,
        hint: "MAIN_HAND, OFF_HAND, ARMOR, CLOAK, SHOES, ACCESSORY, PENDIENTE, HEADWEAR, FACEWEAR, MOUTHWEAR, BACKWEAR, COSTUME",
      },
      { name: "rarity", required: false, hint: "VERDE, AZUL, MORADA" },
      { name: "classRestriction", required: false },
      { name: "description", required: false },
      { name: "ability", required: false },
      { name: "stats", required: false },
      { name: "collectionBonus", required: false },
      { name: "awaken", required: false },
      { name: "refine", required: false },
      { name: "iconUrl", required: false },
    ],
  },
  {
    value: "monsters",
    label: "Monstruos",
    fields: [
      { name: "name", required: true },
      { name: "level", required: true },
      { name: "hp", required: true },
      { name: "atk", required: true },
      { name: "atkMax", required: false },
      { name: "def", required: false },
      {
        name: "element",
        required: false,
        hint: "NEUTRO, AGUA, TIERRA, FUEGO, VIENTO, VENENO, SAGRADO, SOMBRA, FANTASMA, NO_MUERTO",
      },
      { name: "elementLevel", required: false, hint: "1 a 4" },
      {
        name: "race",
        required: true,
        hint: "HUMANOIDE, BESTIA, PLANTA, NO_MUERTO, DEMONIO, INSECTO, PEZ, ANGEL, DRAGON, AMORFO",
      },
      { name: "size", required: false, hint: "PEQUENO, MEDIANO, GRANDE" },
      { name: "description", required: false },
      { name: "iconUrl", required: false },
    ],
  },
  {
    value: "maps",
    label: "Mapas",
    fields: [
      { name: "name", required: true },
      { name: "region", required: true },
      { name: "description", required: false },
    ],
  },
  {
    value: "drops",
    label: "Drops",
    fields: [
      { name: "monster", required: true, hint: "nombre o slug de un monstruo ya cargado" },
      { name: "item", required: true, hint: "nombre o slug de un ítem ya cargado" },
      { name: "rate", required: true, hint: "porcentaje, 0 a 100" },
    ],
    notes: "Carga los monstruos y los ítems antes que sus drops.",
  },
  {
    value: "skills",
    label: "Habilidades (Build PVP)",
    fields: [
      { name: "job", required: true, hint: "nombre exacto de la clase ya creada en /admin/build-pvp, ej: Knight" },
      { name: "name", required: true },
      { name: "maxLevel", required: false, hint: "por defecto 10" },
      { name: "col", required: false, hint: "columna en la grilla del árbol, por defecto 0" },
      { name: "row", required: false, hint: "fila en la grilla del árbol, por defecto 0" },
      { name: "iconUrl", required: false },
      { name: "levelDescriptions", required: false, hint: 'una descripción por nivel, separadas por "|"' },
      {
        name: "prerequisites",
        required: false,
        hint: 'formato "Habilidad:nivel, Otra habilidad:nivel" — deben existir en la misma clase',
      },
    ],
    notes: "Crea primero la clase (job) desde /admin/build-pvp antes de importar sus habilidades.",
  },
];

export function getImportEntity(value: string): ImportEntityDef | undefined {
  return IMPORT_ENTITIES.find((entity) => entity.value === value);
}
