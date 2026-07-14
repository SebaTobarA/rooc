/**
 * Seed de datos de EJEMPLO/PLACEHOLDER.
 *
 * Todo lo cargado acá es contenido inventado y genérico, solo para poder
 * navegar el sitio end-to-end antes de tener la planilla real de la
 * comunidad. Nombres, stats y ubicaciones no representan datos reales del
 * juego ni de ningún otro sitio. Reemplazalo (o bórralo) cuando cargues tus
 * propios datos por el panel admin o por importación masiva.
 *
 * Correr con: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  console.log("Cargando datos de ejemplo (placeholder)...");

  // --- Mapas ---------------------------------------------------------------
  const pradera = await prisma.gameMap.upsert({
    where: { slug: "pradera-de-sauces" },
    update: {},
    create: {
      slug: "pradera-de-sauces",
      name: "Pradera de Sauces",
      region: "Llanuras del Oeste",
      description: "Campo abierto ideal para cazadores principiantes.",
      npcs: {
        create: [
          { name: "Kafra de la Pradera", role: "Kafra" },
          { name: "Guardia del Pueblo", role: "Información" },
        ],
      },
    },
  });

  const cueva = await prisma.gameMap.upsert({
    where: { slug: "cueva-rocosa" },
    update: {},
    create: {
      slug: "cueva-rocosa",
      name: "Cueva Rocosa",
      region: "Montañas Grises",
      description: "Sistema de cuevas húmedas con monstruos de nivel medio.",
      npcs: {
        create: [
          { name: "Minero Retirado", role: "Comerciante" },
          { name: "Explorador Perdido", role: "Misión" },
        ],
      },
    },
  });

  const ruinas = await prisma.gameMap.upsert({
    where: { slug: "ruinas-del-faro" },
    update: {},
    create: {
      slug: "ruinas-del-faro",
      name: "Ruinas del Faro",
      region: "Costa Quebrada",
      description: "Antiguo faro derrumbado, hogar de criaturas más peligrosas.",
      npcs: {
        create: [
          { name: "Fantasma del Farero", role: "Misión" },
          { name: "Comerciante Ambulante", role: "Comerciante" },
        ],
      },
    },
  });

  // --- Monstruos -------------------------------------------------------------
  const monsterDefs = [
    {
      slug: "baba-gelatinosa",
      name: "Baba Gelatinosa",
      level: 3,
      hp: 40,
      atk: 5,
      atkMax: 8,
      def: 0,
      element: "NEUTRO" as const,
      elementLevel: 1,
      race: "PLANTA" as const,
      size: "PEQUENO" as const,
      description: "Criatura básica, primer objetivo de cualquier aventurero.",
      maps: [pradera.id],
    },
    {
      slug: "slime-acido",
      name: "Slime Ácido",
      level: 5,
      hp: 70,
      atk: 8,
      atkMax: 12,
      def: 1,
      element: "VENENO" as const,
      elementLevel: 1,
      race: "PLANTA" as const,
      size: "PEQUENO" as const,
      description: "Variante corrosiva de la baba común.",
      maps: [pradera.id],
    },
    {
      slug: "espantapajaros-errante",
      name: "Espantapájaros Errante",
      level: 8,
      hp: 180,
      atk: 15,
      atkMax: 20,
      def: 3,
      element: "TIERRA" as const,
      elementLevel: 1,
      race: "PLANTA" as const,
      size: "MEDIANO" as const,
      description: "Cobra vida por las noches en los campos abandonados.",
      maps: [pradera.id],
    },
    {
      slug: "lobo-escarchado",
      name: "Lobo Escarchado",
      level: 12,
      hp: 350,
      atk: 20,
      atkMax: 28,
      def: 5,
      element: "AGUA" as const,
      elementLevel: 1,
      race: "BESTIA" as const,
      size: "MEDIANO" as const,
      description: "Caza en manada dentro de las cuevas más frías.",
      maps: [cueva.id],
    },
    {
      slug: "murcielago-cavernario",
      name: "Murciélago Cavernario",
      level: 15,
      hp: 220,
      atk: 18,
      atkMax: 25,
      def: 2,
      element: "SOMBRA" as const,
      elementLevel: 1,
      race: "BESTIA" as const,
      size: "PEQUENO" as const,
      description: "Vuela en enjambres y ataca en la oscuridad.",
      maps: [cueva.id, ruinas.id],
    },
    {
      slug: "cangrejo-de-roca",
      name: "Cangrejo de Roca",
      level: 10,
      hp: 260,
      atk: 14,
      atkMax: 18,
      def: 12,
      element: "TIERRA" as const,
      elementLevel: 1,
      race: "PEZ" as const,
      size: "MEDIANO" as const,
      description: "Caparazón extremadamente resistente a golpes físicos.",
      maps: [ruinas.id],
    },
    {
      slug: "esqueleto-oxidado",
      name: "Esqueleto Oxidado",
      level: 18,
      hp: 400,
      atk: 25,
      atkMax: 35,
      def: 8,
      element: "NO_MUERTO" as const,
      elementLevel: 2,
      race: "NO_MUERTO" as const,
      size: "MEDIANO" as const,
      description: "Restos animados que vagan por las ruinas costeras.",
      maps: [ruinas.id],
    },
    {
      slug: "gargola-menor",
      name: "Gárgola Menor",
      level: 25,
      hp: 900,
      atk: 40,
      atkMax: 55,
      def: 15,
      element: "VIENTO" as const,
      elementLevel: 2,
      race: "DEMONIO" as const,
      size: "GRANDE" as const,
      description: "Guardiana de piedra que despierta ante los intrusos.",
      maps: [ruinas.id],
    },
  ];

  const monsters: Record<string, { id: string }> = {};
  for (const def of monsterDefs) {
    const { maps, ...data } = def;
    const monster = await prisma.monster.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        ...data,
        maps: {
          create: maps.map((mapId) => ({ map: { connect: { id: mapId } } })),
        },
      },
    });
    monsters[def.slug] = monster;
  }

  // --- Ítems -------------------------------------------------------------
  const itemDefs = [
    {
      name: "Espada Oxidada",
      slot: "WEAPON" as const,
      weaponType: "SWORD" as const,
      levelReq: 1,
      rarity: "COMUN" as const,
      stats: "+3 ATK",
      description: "Espada básica, desgastada por el uso.",
    },
    {
      name: "Daga del Cazador",
      slot: "WEAPON" as const,
      weaponType: "DAGGER" as const,
      levelReq: 10,
      rarity: "POCO_COMUN" as const,
      stats: "+8 ATK, +2 DES",
      description: "Preferida por quienes atacan desde las sombras.",
    },
    {
      name: "Vara de Aprendiz",
      slot: "WEAPON" as const,
      weaponType: "ROD" as const,
      levelReq: 5,
      rarity: "COMUN" as const,
      stats: "+15 ATQ Mágico",
      description: "Primera vara entregada a los magos novatos.",
    },
    {
      name: "Arco Corto de Caza",
      slot: "WEAPON" as const,
      weaponType: "BOW" as const,
      levelReq: 12,
      rarity: "POCO_COMUN" as const,
      stats: "+10 ATK a distancia",
      description: "Ligero y preciso a corta distancia.",
    },
    {
      name: "Armadura de Cuero Curtido",
      slot: "ARMOR" as const,
      weaponType: "NONE" as const,
      levelReq: 8,
      rarity: "COMUN" as const,
      stats: "+20 DEF",
      description: "Protección básica de cuero tratado.",
    },
    {
      name: "Escudo de Madera Reforzado",
      slot: "SHIELD" as const,
      weaponType: "NONE" as const,
      levelReq: 10,
      rarity: "COMUN" as const,
      stats: "+15 DEF, +5% resistencia Viento",
      description: "Reforzado con placas de metal en el borde.",
    },
    {
      name: "Botas del Viajero",
      slot: "SHOES" as const,
      weaponType: "NONE" as const,
      levelReq: 5,
      rarity: "COMUN" as const,
      stats: "+5 Velocidad de movimiento",
      description: "Cómodas para largas caminatas.",
    },
    {
      name: "Manto de Sombras",
      slot: "GARMENT" as const,
      weaponType: "NONE" as const,
      levelReq: 20,
      rarity: "RARO" as const,
      stats: "+10 DEF, +5% resistencia Sombra",
      description: "Tejido con hilos que absorben la luz.",
    },
    {
      name: "Anillo del Cazador Novato",
      slot: "ACCESSORY" as const,
      weaponType: "NONE" as const,
      levelReq: 15,
      rarity: "RARO" as const,
      stats: "+3 DES, +3 Suerte",
      description: "Entregado a quienes completan su primera cacería mayor.",
    },
    {
      name: "Fragmento de Gárgola",
      slot: "ACCESSORY" as const,
      weaponType: "NONE" as const,
      levelReq: 1,
      rarity: "EPICO" as const,
      stats: "Material de crafteo (sin bonos directos)",
      description: "Trozo de piedra viva, aún tibio al tacto.",
    },
  ];

  const items: Record<string, { id: string }> = {};
  for (const def of itemDefs) {
    const slug = slugify(def.name);
    const item = await prisma.item.upsert({
      where: { slug },
      update: {},
      create: { ...def, slug },
    });
    items[def.name] = item;
  }

  // --- Drops (monstruo -> ítem -> % probabilidad) ---------------------------
  const dropDefs: Array<{ monster: string; item: string; rate: number }> = [
    { monster: "baba-gelatinosa", item: "Espada Oxidada", rate: 2 },
    { monster: "slime-acido", item: "Espada Oxidada", rate: 1 },
    { monster: "espantapajaros-errante", item: "Botas del Viajero", rate: 5 },
    { monster: "lobo-escarchado", item: "Daga del Cazador", rate: 3 },
    { monster: "lobo-escarchado", item: "Armadura de Cuero Curtido", rate: 8 },
    { monster: "murcielago-cavernario", item: "Manto de Sombras", rate: 1.5 },
    { monster: "esqueleto-oxidado", item: "Vara de Aprendiz", rate: 4 },
    { monster: "esqueleto-oxidado", item: "Anillo del Cazador Novato", rate: 0.5 },
    { monster: "cangrejo-de-roca", item: "Escudo de Madera Reforzado", rate: 6 },
    { monster: "cangrejo-de-roca", item: "Botas del Viajero", rate: 3 },
    { monster: "gargola-menor", item: "Fragmento de Gárgola", rate: 25 },
    { monster: "gargola-menor", item: "Arco Corto de Caza", rate: 2 },
  ];

  for (const drop of dropDefs) {
    const monster = monsters[drop.monster];
    const item = items[drop.item];
    await prisma.drop.upsert({
      where: { monsterId_itemId: { monsterId: monster.id, itemId: item.id } },
      update: { rate: drop.rate },
      create: { monsterId: monster.id, itemId: item.id, rate: drop.rate },
    });
  }

  console.log("Seed completado: 3 mapas, 8 monstruos, 10 ítems, 12 drops.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
