import type { EquipSlot, WeaponType } from "@prisma/client";

/**
 * Ícono placeholder por defecto según tipo de arma o slot de equipo.
 * Las imágenes son arte propio (set "Dawn", variante roja) usado como
 * placeholder hasta que se cargue el ícono real de cada ítem vía admin.
 */
const WEAPON_TYPE_ICON: Record<WeaponType, string | null> = {
  NONE: null,
  SWORD: "/icons/weapons/sword.png",
  DAGGER: "/icons/weapons/dagger.png",
  TWO_HAND_SWORD: "/icons/weapons/two-hand-sword.png",
  SPEAR: "/icons/weapons/spear.png",
  AXE: "/icons/weapons/axe.png",
  HATCHET: "/icons/weapons/hatchet.png",
  MACE: "/icons/weapons/mace.png",
  ROD: "/icons/weapons/rod.png",
  STAFF: "/icons/weapons/staff.png",
  BOW: "/icons/weapons/bow.png",
  CROSSBOW: "/icons/weapons/crossbow.png",
  KNUCKLE: "/icons/weapons/knuckle.png",
  INSTRUMENT: "/icons/weapons/instrument.png",
  WHIP: "/icons/weapons/whip.png",
  BOOK: "/icons/weapons/book.png",
  KATAR: "/icons/weapons/katar.png",
  CASE: "/icons/weapons/case.png",
  GRASS: "/icons/weapons/grass.png",
  SCYTHE: "/icons/weapons/scythe.png",
};

const SLOT_ICON: Partial<Record<EquipSlot, string>> = {
  ARMOR: "/icons/slots/armor.png",
  SHOES: "/icons/slots/shoes.png",
  GARMENT: "/icons/slots/garment.png",
  SHIELD: "/icons/slots/shield.png",
};

const FALLBACK_ITEM_ICON = "/icons/placeholder-item.svg";

/**
 * Resuelve qué ícono mostrar para un ítem cuando no tiene `iconUrl` propio
 * cargado. Prioridad: tipo de arma (si es WEAPON) > slot > placeholder genérico.
 */
export function resolveItemIcon(item: {
  iconUrl?: string | null;
  slot: EquipSlot;
  weaponType: WeaponType;
}): string {
  if (item.iconUrl) return item.iconUrl;

  if (item.slot === "WEAPON") {
    const weaponIcon = WEAPON_TYPE_ICON[item.weaponType];
    if (weaponIcon) return weaponIcon;
  }

  const slotIcon = SLOT_ICON[item.slot];
  if (slotIcon) return slotIcon;

  return FALLBACK_ITEM_ICON;
}

export const WEAPON_TYPE_LABEL: Record<WeaponType, string> = {
  NONE: "Sin arma",
  SWORD: "Espada",
  DAGGER: "Daga",
  TWO_HAND_SWORD: "Espada a dos manos",
  SPEAR: "Lanza",
  AXE: "Hacha",
  HATCHET: "Hacha a dos manos",
  MACE: "Maza",
  ROD: "Vara",
  STAFF: "Báculo",
  BOW: "Arco",
  CROSSBOW: "Ballesta",
  KNUCKLE: "Puño/Nudillo",
  INSTRUMENT: "Instrumento",
  WHIP: "Látigo",
  BOOK: "Libro",
  KATAR: "Katar",
  CASE: "Maletín (Gunslinger)",
  GRASS: "Cola de zorro",
  SCYTHE: "Guadaña",
};

export const EQUIP_SLOT_LABEL: Record<EquipSlot, string> = {
  WEAPON: "Arma",
  SHIELD: "Escudo",
  HEAD_TOP: "Cabeza (superior)",
  HEAD_MID: "Cabeza (media)",
  HEAD_LOW: "Cabeza (inferior)",
  ARMOR: "Armadura",
  GARMENT: "Manto/Capa",
  SHOES: "Calzado",
  ACCESSORY: "Accesorio",
};
