/**
 * Organizador de parties para Core Guild — mismo criterio general que
 * organizeParties/suggestDistribution en src/lib/party/use-campo.ts
 * (cupos por rol, sin repetir clase en una party, máx. 1 músico + 1 healer
 * por party, Lord Knight como tanque de emergencia), pero con un paso
 * previo que prioriza mantener juntos a los miembros marcados "en grupo"
 * con la misma etiqueta interna. Lo que un grupo no logra llenar por rol
 * queda disponible para completarse con miembros solitarios.
 */

import type { Role, SlotLabel } from "@/types/party";
import {
  inferRole,
  isLordKnight,
  isMusicianClass,
  isHealerClass,
  isCreatorClass,
} from "@/lib/party/infer-role";
import type { CoreMember, CorePartySlot } from "./types";

const SLOT_TO_ROLE: Record<SlotLabel, Role> = {
  Tanque: "Tank",
  Soporte: "Support",
  Daño: "DPS",
  Flexible: "Flexible",
};

const FALLBACK_COMPOSITION: SlotLabel[] = ["Tanque", "Soporte", "Daño", "Daño", "Daño"];

function computeQuota(slots: SlotLabel[]): Record<Role, number> {
  const quota: Record<Role, number> = { Tank: 0, DPS: 0, Support: 0, Flexible: 0 };
  slots.forEach((label) => quota[SLOT_TO_ROLE[label]]++);
  return quota;
}

const roleOf = (member: CoreMember): Role => inferRole(member.jobRole);

// Saca el primer miembro cuyo jobRole no esté repetido en la party que se
// está armando. Si todos están repetidos, deja el slot vacío en vez de
// duplicar clase (mismo criterio que el party builder general).
function pickUnique(pool: CoreMember[], usedClasses: Set<string>): CoreMember | undefined {
  const idx = pool.findIndex((m) => !usedClasses.has(m.jobRole.toLowerCase()));
  if (idx === -1) return undefined;
  const [member] = pool.splice(idx, 1);
  usedClasses.add(member.jobRole.toLowerCase());
  return member;
}

export interface OrganizeResult {
  parties: CorePartySlot[];
  assignments: Record<string, string | null>;
}

export function organizeCoreParties(members: CoreMember[], compositions: SlotLabel[][]): OrganizeResult {
  const comps = compositions.length > 0 ? compositions : [FALLBACK_COMPOSITION];
  const active = members.filter((m) => m.inCore);

  const groupsByTag = new Map<string, CoreMember[]>();
  const soloPool: CoreMember[] = [];
  for (const member of active) {
    const tag = member.groupMode === "GROUP" ? member.groupTag.trim() : "";
    if (tag) {
      const key = tag.toLowerCase();
      const bucket = groupsByTag.get(key) ?? [];
      bucket.push(member);
      groupsByTag.set(key, bucket);
    } else {
      soloPool.push(member);
    }
  }
  // Grupos más grandes primero, para que no se queden sin cupo por rol.
  const orderedGroups = [...groupsByTag.values()].sort((a, b) => b.length - a.length);

  const parties: CorePartySlot[] = [];
  const slotsById = new Map<string, SlotLabel[]>();
  const assignments: Record<string, string | null> = {};
  let partyCount = 0;
  // Prefijo único por corrida — "Organizar parties" puede correr varias
  // veces dejando afuera a las parties bloqueadas (ver use-core-guild-board.ts),
  // así que los IDs nuevos no pueden pisar los de una corrida anterior.
  const runId = Date.now().toString(36);

  function createParty(): CorePartySlot {
    const slots = comps[partyCount % comps.length];
    partyCount++;
    const party: CorePartySlot = {
      id: `core_party_${runId}_${partyCount}`,
      name: `Party ${partyCount}`,
      capacity: slots.length,
      locked: false,
    };
    parties.push(party);
    slotsById.set(party.id, slots);
    return party;
  }

  // Ubica lo que entre de `chunk` en una party nueva respetando el cupo por
  // rol; devuelve lo que no entró (rol sin cupo o clase repetida) para
  // reintentarlo en la próxima party.
  function placeGroupChunk(chunk: CoreMember[]): CoreMember[] {
    const party = createParty();
    const quota = computeQuota(slotsById.get(party.id)!);
    const usedClasses = new Set<string>();
    const byRole: Record<Role, CoreMember[]> = { Tank: [], DPS: [], Support: [], Flexible: [] };
    chunk.forEach((m) => byRole[roleOf(m)].push(m));

    (Object.keys(quota) as Role[]).forEach((role) => {
      for (let i = 0; i < quota[role]; i++) {
        const picked = pickUnique(byRole[role], usedClasses) ?? pickUnique(byRole.Flexible, usedClasses);
        if (picked) assignments[picked.discordId] = party.id;
      }
    });

    const overflow: CoreMember[] = [];
    (Object.keys(byRole) as Role[]).forEach((role) => overflow.push(...byRole[role]));
    return overflow;
  }

  for (const group of orderedGroups) {
    let remaining = group;
    while (remaining.length > 0) {
      const before = remaining.length;
      remaining = placeGroupChunk(remaining);
      if (remaining.length === before) break; // nadie del resto entró — se libera al pool solitario
    }
    remaining.forEach((m) => soloPool.push(m));
  }

  // Pools por especialidad para completar huecos y armar parties nuevas con
  // lo que quedó suelto — mismo desglose que use-campo.ts.
  const lordKnights = soloPool.filter((m) => roleOf(m) === "DPS" && isLordKnight(m.jobRole));
  const musicianPool = soloPool.filter((m) => roleOf(m) === "Support" && isMusicianClass(m.jobRole));
  const healerPool = soloPool.filter((m) => roleOf(m) === "Support" && isHealerClass(m.jobRole));
  const creatorPool = soloPool.filter((m) => roleOf(m) === "Support" && isCreatorClass(m.jobRole));
  const tankPool = soloPool.filter((m) => roleOf(m) === "Tank");
  const dpsPool = soloPool.filter((m) => roleOf(m) === "DPS" && !isLordKnight(m.jobRole));
  const flexPool = soloPool.filter((m) => roleOf(m) === "Flexible");

  const remainingSolo = () =>
    tankPool.length +
    dpsPool.length +
    lordKnights.length +
    musicianPool.length +
    healerPool.length +
    creatorPool.length +
    flexPool.length;

  function fillPartyGaps(party: CorePartySlot) {
    const slots = slotsById.get(party.id)!;
    const quota = computeQuota(slots);
    const alreadyIn = Object.entries(assignments)
      .filter(([, partyId]) => partyId === party.id)
      .map(([discordId]) => discordId);
    const usedClasses = new Set(
      alreadyIn.map((id) => members.find((m) => m.discordId === id)?.jobRole.toLowerCase() ?? "")
    );
    const currentByRole: Record<Role, number> = { Tank: 0, DPS: 0, Support: 0, Flexible: 0 };
    alreadyIn.forEach((id) => {
      const m = members.find((mm) => mm.discordId === id);
      if (m) currentByRole[roleOf(m)]++;
    });

    let usedMusician = musicianPool.length === 0;
    let usedHealer = healerPool.length === 0;

    // Tope duro: un miembro "Sin clase" (rol Flexible) puede haber llenado un
    // cupo de Tanque/Soporte/Daño como comodín en placeGroupChunk — ahí
    // currentByRole lo cuenta como Flexible, no como el rol del cupo que
    // realmente ocupa, así que el "missing" por rol puede quedar mal
    // calculado. remainingCapacity evita que eso termine metiendo más gente
    // de la que la party admite, sea cual sea el desajuste por rol.
    let remainingCapacity = party.capacity - alreadyIn.length;

    (Object.keys(quota) as Role[]).forEach((role) => {
      let missing = quota[role] - currentByRole[role];
      while (missing > 0 && remainingCapacity > 0) {
        let picked: CoreMember | undefined;
        if (role === "Tank") {
          picked = pickUnique(tankPool, usedClasses) ?? pickUnique(lordKnights, usedClasses);
        } else if (role === "Support") {
          if (!usedMusician && musicianPool.length > 0) {
            picked = pickUnique(musicianPool, usedClasses);
            usedMusician = true;
          } else if (!usedHealer && healerPool.length > 0) {
            picked = pickUnique(healerPool, usedClasses);
            usedHealer = true;
          } else {
            picked = pickUnique(creatorPool, usedClasses);
          }
        } else if (role === "DPS") {
          picked = pickUnique(dpsPool, usedClasses) ?? pickUnique(lordKnights, usedClasses);
        } else {
          picked =
            pickUnique(flexPool, usedClasses) ??
            pickUnique(creatorPool, usedClasses) ??
            pickUnique(dpsPool, usedClasses) ??
            pickUnique(lordKnights, usedClasses) ??
            pickUnique(musicianPool, usedClasses) ??
            pickUnique(healerPool, usedClasses) ??
            pickUnique(tankPool, usedClasses);
        }
        if (!picked) break;
        assignments[picked.discordId] = party.id;
        missing--;
        remainingCapacity--;
      }
    });
  }

  parties.forEach((party) => {
    if (remainingSolo() > 0) fillPartyGaps(party);
  });

  for (;;) {
    if (remainingSolo() === 0) break;
    const quota = computeQuota(comps[partyCount % comps.length]);
    const hasEssentialTank = quota.Tank === 0 || tankPool.length + lordKnights.length > 0;
    const supportLeft = musicianPool.length + healerPool.length + creatorPool.length;
    const hasEssentialSupport = quota.Support === 0 || supportLeft > 0;
    if (!hasEssentialTank || !hasEssentialSupport) break;

    const party = createParty();
    fillPartyGaps(party);
  }

  active.forEach((m) => {
    if (!(m.discordId in assignments)) assignments[m.discordId] = null;
  });

  return { parties, assignments };
}
