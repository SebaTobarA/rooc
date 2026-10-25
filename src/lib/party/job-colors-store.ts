/**
 * Lectura de la paleta de colores por job guardada para toda la guild
 * (PartyJobColors, fila única). Solo servidor: la usan el Party Builder y
 * "Mi composición" del inicio del panel.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { readJobColors, type JobColors } from "@/lib/party/job-colors";

export async function loadJobColors(): Promise<JobColors> {
  const row = await prisma.partyJobColors.findFirst();
  return readJobColors(row?.colors);
}
