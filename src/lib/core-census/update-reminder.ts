/**
 * Aviso "Actualizar mi ficha" del inicio del panel. Los oficiales fijan en
 * /admin/requisitos-core cada cuántos días quieren que los jugadores
 * actualicen su ficha (CoreRequirementSettings.updateIntervalDays, 0 = sin
 * aviso). Al jugador se le avisa cuando su última validación es más vieja
 * que eso, o cuando nunca tuvo una.
 */

import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SheetUpdateReminder =
  | { kind: "never"; intervalDays: number }
  | { kind: "overdue"; intervalDays: number; daysSince: number };

export async function getSheetUpdateReminder(discordId: string): Promise<SheetUpdateReminder | null> {
  const [settings, sheet] = await Promise.all([
    prisma.coreRequirementSettings.findFirst({ select: { updateIntervalDays: true } }),
    prisma.coreCharacterSheet.findUnique({ where: { discordId }, select: { inCore: true, reviewedAt: true } }),
  ]);
  const intervalDays = settings?.updateIntervalDays ?? 0;
  if (intervalDays <= 0 || !sheet?.inCore) return null;

  // Ya reportó y espera validación: no hay nada más que pedirle.
  const pending = await prisma.coreSheetSubmission.findFirst({
    where: { discordId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return null;

  if (!sheet.reviewedAt) return { kind: "never", intervalDays };
  const daysSince = Math.floor((Date.now() - sheet.reviewedAt.getTime()) / DAY_MS);
  return daysSince >= intervalDays ? { kind: "overdue", intervalDays, daysSince } : null;
}
