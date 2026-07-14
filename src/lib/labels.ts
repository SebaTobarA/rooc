import type { CardRarity, CardSlot, Element, ItemRarity, MonsterRace, MonsterSize } from "@prisma/client";

export const RARITY_LABEL: Record<ItemRarity, string> = {
  COMUN: "Común",
  POCO_COMUN: "Poco común",
  RARO: "Raro",
  EPICO: "Épico",
  LEGENDARIO: "Legendario",
};

// Clases de color Tailwind aplicadas al texto/borde según rareza.
export const RARITY_COLOR: Record<ItemRarity, string> = {
  COMUN: "text-slate-300 border-slate-500/40",
  POCO_COMUN: "text-emerald-400 border-emerald-500/40",
  RARO: "text-sky-400 border-sky-500/40",
  EPICO: "text-fuchsia-400 border-fuchsia-500/40",
  LEGENDARIO: "text-amber-400 border-amber-500/40",
};

export const ELEMENT_LABEL: Record<Element, string> = {
  NEUTRO: "Neutro",
  AGUA: "Agua",
  TIERRA: "Tierra",
  FUEGO: "Fuego",
  VIENTO: "Viento",
  VENENO: "Veneno",
  SAGRADO: "Sagrado",
  SOMBRA: "Sombra",
  FANTASMA: "Fantasma",
  NO_MUERTO: "No-muerto",
};

export const RACE_LABEL: Record<MonsterRace, string> = {
  HUMANOIDE: "Humanoide",
  BESTIA: "Bestia",
  PLANTA: "Planta",
  NO_MUERTO: "No-muerto",
  DEMONIO: "Demonio",
  INSECTO: "Insecto",
  PEZ: "Pez",
  ANGEL: "Ángel",
  DRAGON: "Dragón",
  AMORFO: "Amorfo",
};

export const SIZE_LABEL: Record<MonsterSize, string> = {
  PEQUENO: "Pequeño",
  MEDIANO: "Mediano",
  GRANDE: "Grande",
};

export const CARD_SLOT_LABEL: Record<CardSlot, string> = {
  MAIN_HAND: "Mano principal",
  OFF_HAND: "Mano secundaria",
  ARMOR: "Armadura",
  CLOAK: "Capa",
  SHOES: "Calzado",
  ACCESSORY: "Accesorio",
  PENDIENTE: "Pendiente",
  HEADWEAR: "Cabeza",
  FACEWEAR: "Rostro",
  MOUTHWEAR: "Boca",
  BACKWEAR: "Espalda",
  COSTUME: "Costume",
};

export const CARD_RARITY_LABEL: Record<CardRarity, string> = {
  VERDE: "Verde",
  AZUL: "Azul",
  MORADA: "Morada",
};

// Clases de color Tailwind aplicadas al texto/borde según rareza de carta.
export const CARD_RARITY_COLOR: Record<CardRarity, string> = {
  VERDE: "text-emerald-400 border-emerald-500/40",
  AZUL: "text-sky-400 border-sky-500/40",
  MORADA: "text-fuchsia-400 border-fuchsia-500/40",
};
